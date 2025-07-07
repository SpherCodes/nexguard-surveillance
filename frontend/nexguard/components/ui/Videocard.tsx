'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Play, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  Wifi,
  WifiOff,
  Circle
} from 'lucide-react'
import { connectToWebRtcStream } from '@/lib/services/webrtc'

const Videocard = ({ camera }: { camera: Camera }) => {

  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': 
      case 'running': return 'bg-green-500'
      case 'recording': return 'bg-red-500 animate-pulse'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
      case 'running': return <Wifi className="h-4 w-4 text-green-500" />
      case 'recording': return <Circle className="h-4 w-4 text-red-500 fill-current animate-pulse" />
      case 'offline': return <WifiOff className="h-4 w-4 text-gray-400" />
      default: return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  // Helper function to get display status
  const getDisplayStatus = (status: string) => {
    switch (status) {
      case 'running': return 'online'
      default: return status
    }
  }

  useEffect(() => {
    // Copy the video element reference to use in cleanup
    const videoElement = videoRef.current;
    
    // Add validation for camera and camera.camera_id
    if (!camera) {
      console.error('No camera object provided');
      setConnectionStatus('disconnected');
      return;
    }

    if (!camera.camera_id) {
      console.error('Camera ID is missing or empty:', camera);
      setConnectionStatus('disconnected');
      return;
    }

    // Only attempt to connect if camera is enabled and not offline
    if (camera.enabled && camera.status !== 'offline') {
      let connectionAttempts = 0;
      const maxConnectionAttempts = 3;
      let connectionTimer: NodeJS.Timeout;
      
      const initWebRTC = async () => {
        try {
          console.log(`Attempting WebRTC connection for camera: ${camera.camera_id}`);
          setConnectionStatus('connecting');
          
          // Clear any existing connection timer
          if (connectionTimer) clearTimeout(connectionTimer);
          
          // Set a connection timeout
          connectionTimer = setTimeout(() => {
            console.error(`Connection timeout for camera ${camera.camera_id}`);
            setConnectionStatus('disconnected');
          }, 15000); // 15 seconds timeout
          
          // Convert camera.camera_id to string if it's not already
          const cameraId = String(camera.camera_id);
          const mediaStream = await connectToWebRtcStream(cameraId);

          clearTimeout(connectionTimer);
          
          if (!mediaStream) {
            throw new Error('No media stream received');
          }
          
          // Check if the stream has tracks
          if (mediaStream.getTracks().length === 0) {
            console.warn('Media stream has no tracks');
            // Wait a bit to see if tracks arrive late
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (mediaStream.getTracks().length === 0) {
              throw new Error('Media stream has no tracks after waiting');
            }
          }

          if (videoRef.current) {
            // Make sure to directly set the srcObject
            videoRef.current.srcObject = mediaStream;
            
            // Add event listeners to confirm video is playing
            videoRef.current.onloadedmetadata = () => {
              console.log("Video metadata loaded, playing...");
              videoRef.current?.play()
                .then(() => {
                  console.log("Video playback started successfully");
                  setIsPlaying(true);
                  setConnectionStatus('connected');
                })
                .catch(err => {
                  console.error("Error playing video:", err);
                  setConnectionStatus('disconnected');
                });
            };
            
            // Add error handler for video element
            videoRef.current.onerror = (err) => {
              console.error("Video element error:", err);
              setConnectionStatus('disconnected');
            };
          } else {
            throw new Error('Video reference is not available');
          }
        } catch (error) {
          console.error('Error connecting to WebRTC stream:', error);
          clearTimeout(connectionTimer);
          setConnectionStatus('disconnected');
          
          // Try reconnecting if we haven't reached max attempts
          if (connectionAttempts < maxConnectionAttempts) {
            connectionAttempts++;
            console.log(`Retrying connection (${connectionAttempts}/${maxConnectionAttempts})`);
            setTimeout(initWebRTC, 3000); // Wait 3 seconds before retry
          }
        }
      };
      
      initWebRTC();
      
      // Cleanup function
      return () => {
        if (connectionTimer) clearTimeout(connectionTimer);
        
        if (videoElement && videoElement.srcObject) {
          const mediaStream = videoElement.srcObject as MediaStream;
          mediaStream.getTracks().forEach(track => {
            track.stop();
            console.log(`Stopped track: ${track.kind}`);
          });
          // Clear the srcObject
          videoElement.srcObject = null;
        }
      };
    } else {
      setConnectionStatus('disconnected');
    }
  }, [camera?.camera_id, camera?.status, camera?.enabled])

  // Early return if no camera data
  if (!camera) {
    return (
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <div>No camera data</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative bg-black rounded-lg overflow-hidden aspect-video group cursor-pointer shadow-md"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element */}
      <video
        width="500"
        height="250"
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted={isMuted}
        playsInline
      />

      {/* Placeholder Background (shown while video loads or if offline) */}
      {(connectionStatus !== 'connected' || camera.status === 'offline' || !camera.enabled) && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">📹</div>
            <div className="text-lg font-semibold">{camera.name || `Camera ${camera.camera_id}`}</div>
            <div className="text-sm opacity-75">{camera.location || 'Unknown Location'}</div>
            <div className="text-xs opacity-50">ID: {camera.camera_id || 'No ID'}</div>
            <div className="text-xs opacity-50">
              {camera.resolution ? `${camera.resolution[0]}x${camera.resolution[1]}` : 'Unknown'} • {camera.fps || 'Unknown'}fps
            </div>
            {connectionStatus === 'connecting' && camera.enabled && camera.status !== 'offline' && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                <span>Connecting...</span>
              </div>
            )}
            {connectionStatus === 'disconnected' && (
              <div className="mt-4 text-red-400">Connection failed</div>
            )}
            {(camera.status === 'offline' || !camera.enabled) && (
              <div className="mt-4 text-gray-400">
                {!camera.enabled ? 'Camera disabled' : 'Camera offline'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Info Overlay - Top */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-start justify-between">
          <div className="text-white">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold">{camera.name || `Camera ${camera.camera_id}`}</h3>
              {getStatusIcon(camera.status)}
            </div>
            <p className="text-sm opacity-90">{camera.location || 'Unknown Location'}</p>
            <p className="text-xs opacity-75">{camera.lastSeen || 'Active'}</p>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`h-2 w-2 rounded-full ${getStatusColor(camera.status)}`}></span>
            <span className="text-xs text-white/90 uppercase font-medium">
              {getDisplayStatus(camera.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Video Controls - Bottom (only shown when connected) */}
      {camera.enabled && camera.status !== 'offline' && connectionStatus === 'connected' && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-white/10"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <span className="text-xs text-white/75">
                {camera.resolution ? `${camera.resolution[0]}x${camera.resolution[1]}` : 'Unknown'} • {camera.fps || 'Unknown'}fps
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button className="text-white hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-white/10">
                <Settings className="h-4 w-4" />
              </button>
              <button className="text-white hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-white/10">
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      {camera.status === 'recording' && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-1 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
            <Circle className="h-2 w-2 fill-current animate-pulse" />
            <span>REC</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Videocard
