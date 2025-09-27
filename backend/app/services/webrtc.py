import asyncio
import fractions
import queue
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack, RTCIceCandidate, RTCConfiguration, RTCIceServer
from av import VideoFrame
import cv2
import numpy as np
from typing import Dict
import time

class CameraStreamTrack(VideoStreamTrack):
    """A video stream track that captures frames from the inference engine"""
    
    def __init__(self, camera_id, inference_engine, video_capture):
        super().__init__()
        self.camera_id = camera_id
        self.inference_engine = inference_engine
        self.video_capture = video_capture
        self._frame_count = 0
        self._cache_timeout = 2.0 
        self._no_signal_interval = 5.0
        self._last_no_signal_time = 0
        self._cached_frame = None
        self._last_frame_time = 0
        
    async def recv(self):
        """Get the next video frame from video capture with detection overlays"""
        current_time = time.time()
        
        # Get frame directly from video capture
        frame_data = self.video_capture.get_latest_frame(self.camera_id)
        
        if frame_data and frame_data.frame is not None:
            frame = frame_data.frame.copy()
            
            # Check for recent detections from inference engine
            detection_data = None
            if (self.camera_id in self.inference_engine.results_buffer and 
                not self.inference_engine.results_buffer[self.camera_id].empty()):
                try:
                    buffer = self.inference_engine.results_buffer[self.camera_id]
                    
                    # Get the latest detection data
                    latest_detection = None
                    temp_items = []
                    
                    # Drain buffer to get latest detection
                    for _ in range(min(buffer.qsize(), 10)):
                        try:
                            detection_item = buffer.get_nowait()
                            temp_items.append(detection_item)
                            latest_detection = detection_item
                        except queue.Empty:
                            break
                    
                    # Put items back
                    for item in temp_items:
                        try:
                            buffer.put(item, block=False)
                        except queue.Full:
                            pass
                    
                    if latest_detection and hasattr(latest_detection, 'detections'):
                        detection_data = latest_detection
                        
                except Exception as e:
                    print(f"Error getting detection data for camera {self.camera_id}: {e}")
            
            # Add detection overlays if available
            if detection_data and detection_data.detections:
                human_detected = False
                
                # Draw detection boxes and labels
                for detection in detection_data.detections:
                    box = detection['box']
                    cls_name = detection['name']
                    conf = detection['conf']
                    
                    # Draw bounding box
                    cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 2)
                    
                    # Draw label with confidence
                    text = f"{cls_name} {conf:.2f}"
                    (text_width, text_height), _ = cv2.getTextSize(
                        text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2
                    )
                    
                    # Background rectangle for text
                    cv2.rectangle(
                        frame,
                        (box[0], box[1] - text_height - 10),
                        (box[0] + text_width, box[1]),
                        (0, 255, 0),
                        -1
                    )
                    
                    # Text
                    cv2.putText(frame, text, (box[0], box[1] - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
                    
                    if cls_name.lower() == 'person':
                        human_detected = True
                
                # Add status overlay
                status_text = f"Camera: {self.camera_id}"
                if human_detected:
                    status_text += " |  HUMAN DETECTED"
                    cv2.putText(frame, status_text, (10, 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                else:
                    cv2.putText(frame, status_text, (10, 30),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            else:
                # No detections
                cv2.putText(frame, f"Camera: {self.camera_id}", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Cache the frame
            self._cached_frame = frame.copy()
            self._last_frame_time = current_time
            
            # Convert BGR (OpenCV format) to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Create video frame
            video_frame = VideoFrame.from_ndarray(frame_rgb, format="rgb24")
            video_frame.pts = self._frame_count
            video_frame.time_base = fractions.Fraction(1, 30)
            
            self._frame_count += 1
            return video_frame
            
        elif self._cached_frame is not None and current_time - self._last_frame_time < self._cache_timeout:
            # Use cached frame
            frame = self._cached_frame
            
            # Convert BGR (OpenCV format) to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Create video frame
            video_frame = VideoFrame.from_ndarray(frame_rgb, format="rgb24")
            video_frame.pts = self._frame_count
            video_frame.time_base = fractions.Fraction(1, 30)
            
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
                            offer_sdp: str,
                            inference_engine,
                            video_capture) -> str:
        """Create an answer for a WebRTC offer using processed frames"""
        try:
            if camera_id not in self.peer_connections:
                self.peer_connections[camera_id] = {}
                self.tracks[camera_id] = {}
            ice_servers = [RTCIceServer(urls=["stun:stun.l.google.com:19302"])]
            configuration = RTCConfiguration(iceServers=ice_servers)
            pc = RTCPeerConnection(configuration=configuration)
            self.peer_connections[camera_id][peer_id] = pc
            
            track = CameraStreamTrack(camera_id, inference_engine, video_capture)
            self.tracks[camera_id][peer_id] = track
            pc.addTrack(track)
            # @pc.on("connectionstatechange")
            # async def on_connectionstatechange():
            #     if pc.connectionState == "failed":
            #         await self.close_peer_connection(camera_id, peer_id)
            # @pc.on("iceconnectionstatechange")
            # async def on_iceconnectionstatechange():
            #     if pc.iceConnectionState == "failed":
            #         await self.close_peer_connection(camera_id, peer_id)
            offer = RTCSessionDescription(sdp=offer_sdp, type="offer")
            await pc.setRemoteDescription(offer)
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            return pc.localDescription.sdp
        except Exception as e:
            print(f"Error creating answer: {e}")
            raise
    
    async def add_ice_candidate(self, camera_id: str, peer_id: str, candidate: RTCIceCandidate):
        """Add an ICE candidate to a peer connection"""
        try:
            if (camera_id in self.peer_connections and 
                peer_id in self.peer_connections[camera_id]):
                pc = self.peer_connections[camera_id][peer_id]
                await pc.addIceCandidate(candidate)
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
                    
        except Exception as e:
            print(f"Error closing peer connection: {e}")
    
    def get_active_connections_count(self) -> dict:
        """Get count of active peer connections"""
        counts = {}
        for camera_id, peers in self.peer_connections.items():
            counts[camera_id] = len(peers)
        return counts