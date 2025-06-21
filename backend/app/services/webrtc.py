import asyncio
import fractions
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack, RTCIceCandidate, RTCConfiguration, RTCIceServer
from av import VideoFrame
import cv2
import numpy as np
from typing import Dict, Optional
import time

class CameraStreamTrack(VideoStreamTrack):
    """A video stream track that captures frames from VideoCapture"""
    
    def __init__(self, camera_id, video_capture):
        super().__init__()
        self.camera_id = camera_id
        self.video_capture = video_capture
        self._frame_count = 0
        
    async def recv(self):
        """Get the next video frame"""
        frame_data = None
        
        # Try to get frame from camera buffer
        if (self.camera_id in self.video_capture.frame_buffers and 
            not self.video_capture.frame_buffers[self.camera_id].empty()):
            try:
                frame_data = self.video_capture.frame_buffers[self.camera_id].get_nowait()
            except Exception:
                pass
        
        if frame_data:
            # Extract the actual frame from frame_data
            frame = frame_data.frame if hasattr(frame_data, 'frame') else frame_data[0]
            
            # Convert BGR (OpenCV format) to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Create video frame
            video_frame = VideoFrame.from_ndarray(frame_rgb, format="rgb24")
            video_frame.pts = self._frame_count
            video_frame.time_base = fractions.Fraction(1, 30)  # 30 fps
            
            self._frame_count += 1
            return video_frame
        else:
            # Create a blank frame if no camera frame is available
            config = self.video_capture.cameras.get(self.camera_id)
            if config:
                width, height = config.resolution
            else:
                width, height = 640, 480
                
            blank_frame = np.zeros((height, width, 3), np.uint8)
            
            # Add "No signal" text to the frame
            font = cv2.FONT_HERSHEY_SIMPLEX
            text = "No Signal"
            text_size = cv2.getTextSize(text, font, 1, 2)[0]
            text_x = (width - text_size[0]) // 2
            text_y = (height + text_size[1]) // 2
            cv2.putText(blank_frame, text, (text_x, text_y), font, 1, (255, 255, 255), 2)
            
            # Convert to RGB
            blank_frame_rgb = cv2.cvtColor(blank_frame, cv2.COLOR_BGR2RGB)
            
            # Create video frame
            video_frame = VideoFrame.from_ndarray(blank_frame_rgb, format="rgb24")
            video_frame.pts = self._frame_count
            video_frame.time_base = fractions.Fraction(1, 30)
            
            self._frame_count += 1
            
            # Add a small delay to prevent busy waiting
            await asyncio.sleep(1/30)
            
            return video_frame


class RTCSessionManager:
    """Manages WebRTC peer connections and media tracks"""
    
    def __init__(self):
        self.peer_connections: Dict[str, Dict[str, RTCPeerConnection]] = {}
        self.tracks: Dict[str, Dict[str, CameraStreamTrack]] = {}
        
    async def create_answer(self, camera_id: str, peer_id: str, 
                           offer_sdp: str, video_capture) -> str:
        """Create an answer for a WebRTC offer"""
        try:
            # Create peer connection with proper RTCConfiguration
            if camera_id not in self.peer_connections:
                self.peer_connections[camera_id] = {}
                self.tracks[camera_id] = {}
            
            # Create RTCConfiguration with proper RTCIceServer objects
            ice_servers = [RTCIceServer(urls=["stun:stun.l.google.com:19302"])]
            configuration = RTCConfiguration(iceServers=ice_servers)
            
            pc = RTCPeerConnection(configuration=configuration)
            self.peer_connections[camera_id][peer_id] = pc
            
            # Create and add track
            track = CameraStreamTrack(camera_id, video_capture)
            self.tracks[camera_id][peer_id] = track
            pc.addTrack(track)
            
            # Set up connection state handlers
            @pc.on("connectionstatechange")
            async def on_connectionstatechange():
                print(f"Connection state for {camera_id}/{peer_id}: {pc.connectionState}")
                if pc.connectionState == "failed":
                    await self.close_peer_connection(camera_id, peer_id)
            
            @pc.on("iceconnectionstatechange")
            async def on_iceconnectionstatechange():
                print(f"ICE connection state for {camera_id}/{peer_id}: {pc.iceConnectionState}")
                if pc.iceConnectionState == "failed":
                    await self.close_peer_connection(camera_id, peer_id)
            
            # Set remote description
            offer = RTCSessionDescription(sdp=offer_sdp, type="offer")
            await pc.setRemoteDescription(offer)
            
            # Create answer
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            
            print(f"Created answer for {camera_id}/{peer_id}")
            return pc.localDescription.sdp
            
        except Exception as e:
            print(f"Error creating answer: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    async def add_ice_candidate(self, camera_id: str, peer_id: str, candidate: RTCIceCandidate):
        """Add an ICE candidate to a peer connection"""
        try:
            if (camera_id in self.peer_connections and 
                peer_id in self.peer_connections[camera_id]):
                pc = self.peer_connections[camera_id][peer_id]
                await pc.addIceCandidate(candidate)
                print(f"Added ICE candidate for {camera_id}/{peer_id}")
        except Exception as e:
            print(f"Error adding ICE candidate: {e}")
    
    async def close_peer_connection(self, camera_id: str, peer_id: str):
        """Close a peer connection and clean up resources"""
        try:
            if (camera_id in self.peer_connections and 
                peer_id in self.peer_connections[camera_id]):
                pc = self.peer_connections[camera_id][peer_id]
                await pc.close()
                
                # Clean up
                del self.peer_connections[camera_id][peer_id]
                if peer_id in self.tracks.get(camera_id, {}):
                    del self.tracks[camera_id][peer_id]
                    
                # Remove empty dictionaries
                if not self.peer_connections[camera_id]:
                    del self.peer_connections[camera_id]
                if camera_id in self.tracks and not self.tracks[camera_id]:
                    del self.tracks[camera_id]
                    
                print(f"Closed peer connection for {camera_id}/{peer_id}")
        except Exception as e:
            print(f"Error closing peer connection: {e}")
    
    def get_active_connections_count(self) -> dict:
        """Get count of active peer connections"""
        counts = {}
        for camera_id, peers in self.peer_connections.items():
            counts[camera_id] = len(peers)
        return counts