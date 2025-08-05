/* eslint-disable @typescript-eslint/no-explicit-any */
import { updateCameraInCache } from '@/lib/utils';
import { QueryClient } from '@tanstack/react-query';


//TODO:Remove query client from WebRTCManager
class WebRTCManager {
  private queryClient: QueryClient | null = null;
  private connections: Map<number, MediaStream> = new Map();
  private peerConnections: Map<number, RTCPeerConnection> = new Map();
  private webSockets: Map<number, WebSocket> = new Map();
  private signalingSocket: WebSocket | null = null;
  private signalingUrl = process.env.NEXT_PUBLIC_WEBRTC_SIGNALING_URL;
  private reconnectAttempts: Map<number, number> = new Map();
  private maxReconnectAttempts = 3;

  constructor() {
    this.initializeSignalingSocket();
  }
  setQueryClient(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  private updateCameraStatus(cameraId: number, status: 'online' | 'offline') {
    if (this.queryClient) {
      updateCameraInCache(this.queryClient, cameraId, { status });
    }
  }

  private initializeSignalingSocket() {
    if (!this.signalingUrl) {
      console.error('WebRTC signaling URL not configured');
      return;
    }

    try {
      this.signalingSocket = new WebSocket(this.signalingUrl);
      this.setupSocketListeners();
    } catch (error) {
      console.error('Failed to initialize signaling socket:', error);
    }
  }

  private setupSocketListeners() {
    if (!this.signalingSocket) return;

    this.signalingSocket.onopen = () => {
      console.log('Signaling socket connected');
    };

    this.signalingSocket.onclose = () => {
      console.log('Signaling socket disconnected');
    };

    this.signalingSocket.onerror = (error) => {
      console.error('Signaling socket error:', error);
    };

    this.signalingSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleSignalingMessage(message);
      } catch (error) {
        console.error('Failed to parse signaling message:', error);
      }
    };
  }

  private async handleSignalingMessage(message: any) {
    const { type, sdp, candidate, cameraId } = message;

    const pc = this.peerConnections.get(cameraId);
    if (!pc) {
      console.warn(`No peer connection found for camera ${cameraId}`);
      return;
    }

    try {
      if (type === 'answer' && sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } else if (type === 'ice' && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error(
        `Error handling signaling message for camera ${cameraId}:`,
        error
      );
    }
  }

  async getStream(cameraId: number): Promise<MediaStream | null> {
    if (this.connections.has(cameraId)) {
      updateCameraInCache(this.queryClient!, cameraId, { status: 'online' });
      const stream = this.connections.get(cameraId)!;
      if (stream.active) {
        return stream;
      } else {
        updateCameraInCache(this.queryClient!, cameraId, { status: 'offline' });
        this.releaseStream(cameraId);
      }
    }

    try {
      const stream = await this.connectToWebRtcStream(cameraId);
      if (stream) {
        this.connections.set(cameraId, stream);
        this.reconnectAttempts.delete(cameraId);
        // Update camera status to online when stream is active
        this.updateCameraStatus(cameraId, 'online');
      }
      return stream;
    } catch (error) {
      console.error(`Failed to get stream for camera ${cameraId}:`, error);
      // Update camera status to offline when stream fails
      this.updateCameraStatus(cameraId, 'offline');
      return null;
    }
  }

  releaseStream(cameraId: number) {
    console.log(`Releasing stream for camera ${cameraId}`);

    // Update camera status to offline when releasing stream
    this.updateCameraStatus(cameraId, 'offline');

    // Close MediaStream
    const stream = this.connections.get(cameraId);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.connections.delete(cameraId);
    }

    // Close PeerConnection
    const pc = this.peerConnections.get(cameraId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(cameraId);
    }

    // Close WebSocket
    const ws = this.webSockets.get(cameraId);
    if (ws) {
      ws.close();
      this.webSockets.delete(cameraId);
    }

    // Clean up reconnect attempts
    this.reconnectAttempts.delete(cameraId);
  }

  releaseAllStreams() {
    console.log('Releasing all streams');

    // Get all camera IDs before releasing (to avoid modifying map while iterating)
    const cameraIds = Array.from(this.connections.keys());
    cameraIds.forEach((cameraId) => this.releaseStream(cameraId));

    // Close signaling socket
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }
  }

  hasStream(cameraId: number): boolean {
    const stream = this.connections.get(cameraId);
    return stream ? stream.active : false;
  }

  getConnectionState(cameraId: number): RTCPeerConnectionState | null {
    const pc = this.peerConnections.get(cameraId);
    return pc ? pc.connectionState : null;
  }

  private async connectToWebRtcStream(
    cameraId: number
  ): Promise<MediaStream | null> {
    // Check if we've exceeded reconnection attempts
    const attempts = this.reconnectAttempts.get(cameraId) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      throw new Error(
        `Max reconnection attempts exceeded for camera ${cameraId}`
      );
    }

    return new Promise(async (resolve, reject) => {
      const wsUrl = `${process.env.NEXT_PUBLIC_WEBRTC_SIGNALING_URL}${cameraId}`;
      console.log('Connecting to WebRTC stream:', wsUrl);
      const ws = new WebSocket(wsUrl);
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnection.addTransceiver('video', { direction: 'recvonly' });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Store references for cleanup
      this.webSockets.set(cameraId, ws);
      this.peerConnections.set(cameraId, peerConnection);

      // Set timeout for connection attempt
      const connectionTimeout = setTimeout(() => {
        this.cleanup(cameraId, ws, peerConnection);
        reject(new Error(`Connection timeout for camera ${cameraId}`));
      }, 30000); // 30 second timeout

      const cleanup = () => {
        clearTimeout(connectionTimeout);
      };

      ws.onopen = async () => {
        try {
          console.log(`WebSocket connected for camera ${cameraId}`);
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          this.sendWhenReady(ws, {
            type: 'offer',
            sdp: offer.sdp,
            cameraId
          });
        } catch (err) {
          cleanup();
          this.cleanup(cameraId, ws, peerConnection);
          reject(err);
        }
      };

      ws.onerror = (event) => {
        console.error(`WebSocket error for camera ${cameraId}:`, event);
        cleanup();
        this.cleanup(cameraId, ws, peerConnection);
        reject(new Error(`WebSocket connection failed for camera ${cameraId}`));
      };

      ws.onclose = () => {
        console.log(`WebSocket closed for camera ${cameraId}`);
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'answer' && message.data) {
            await peerConnection.setRemoteDescription(message.data);
          } else if (
            message.type === 'answer' &&
            message.sdp &&
            message.sdpType
          ) {
            await peerConnection.setRemoteDescription({
              type: message.sdpType,
              sdp: message.sdp
            });
          } else if (message.type === 'answer' && message.sdp) {
            await peerConnection.setRemoteDescription({
              type: 'answer',
              sdp: message.sdp
            });
          } else if (message.type === 'answer') {
            console.error('Received malformed answer message:', message);
          } else if (message.type === 'ice-candidate') {
            if (message.data) {
              await peerConnection.addIceCandidate(
                new RTCIceCandidate(message.data)
              );
            }
          }
        } catch (error) {
          console.error(
            `Error processing message for camera ${cameraId}:`,
            error
          );
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendWhenReady(ws, {
            type: 'ice-candidate',
            data: event.candidate,
            cameraId
          });
        }
      };

      peerConnection.ontrack = (event) => {
        console.log(`Received track for camera ${cameraId}`);
        cleanup();
        resolve(event.streams[0]);
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log(`Connection state for camera ${cameraId}: ${state}`);

        if (state === 'failed' || state === 'disconnected') {
          cleanup();
          this.cleanup(cameraId, ws, peerConnection);

          // Update camera status to offline when connection fails
          this.updateCameraStatus(cameraId, 'offline');

          // Increment reconnect attempts
          this.reconnectAttempts.set(cameraId, attempts + 1);

          reject(
            new Error(`WebRTC connection ${state} for camera ${cameraId}`)
          );
        } else if (state === 'connected') {
          // Update camera status to online when connection is established
          this.updateCameraStatus(cameraId, 'online');
        }
      };

      peerConnection.onicecandidateerror = (event) => {
        console.error(`ICE candidate error for camera ${cameraId}:`, event);
      };
    });
  }

  private cleanup(cameraId: number, ws?: WebSocket, pc?: RTCPeerConnection) {
    if (ws) {
      ws.close();
      this.webSockets.delete(cameraId);
    }

    if (pc) {
      pc.close();
      this.peerConnections.delete(cameraId);
    }
  }

  private sendWhenReady(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else if (ws.readyState === WebSocket.CONNECTING) {
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
          clearInterval(interval);
        } else if (
          ws.readyState === WebSocket.CLOSED ||
          ws.readyState === WebSocket.CLOSING
        ) {
          clearInterval(interval);
        }
      }, 50);
      setTimeout(() => clearInterval(interval), 5000);
    }
  }

  async getConnectionStats(cameraId: number): Promise<RTCStatsReport | null> {
    const pc = this.peerConnections.get(cameraId);
    if (pc) {
      return await pc.getStats();
    }
    return null;
  }

  async reconnectStream(cameraId: number): Promise<MediaStream | null> {
    console.log(`Attempting to reconnect camera ${cameraId}`);
    this.releaseStream(cameraId);
    return this.getStream(cameraId);
  }
}

export const webRTCManager = new WebRTCManager();
