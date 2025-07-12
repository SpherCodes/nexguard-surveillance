import os

os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_TRANSFORMS"] = "0"
os.environ["OPENCV_VIDEOIO_MSMF_ENABLE_HW_DEVICE"] = "0"

import cv2
import numpy as np
import time
import threading
import queue
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional, Any


@dataclass
class CameraConfig:
    """Configuration for a camera source."""
    camera_id: str
    url: str  # RTSP URL, file path, or camera index (0, 1, etc.)
    fps_target: int = 15
    resolution: Tuple[int, int] = (1280, 720)  # (width, height)
    buffer_size: int = 10  # Number of frames to keep in buffer
    enabled: bool = True
    location: str = "Unknown"
    zone_id: int = 0  # Zone ID for camera grouping


class FrameData:
    """Container for a processed frame and its metadata."""
    
    def __init__(self, frame: np.ndarray, camera_id: str, timestamp: float, 
        frame_number: int, resolution: Tuple[int, int]):
        self.frame = frame
        self.camera_id = camera_id
        self.timestamp = timestamp
        self.frame_number = frame_number
        self.resolution = resolution
        self.detections = []  # Will be populated by the AI module
        self.processed = False


class VideoCapture:
    """Handles video capture from multiple sources."""
    
    def __init__(self):
        self.cameras: Dict[str, CameraConfig] = {}
        self.streams: Dict[str, Any] = {}
        self.frame_buffers: Dict[str, queue.Queue] = {}
        self.stop_flags: Dict[str, bool] = {}
        self.threads: Dict[str, threading.Thread] = {}
        self.last_frame_time: Dict[str, float] = {}
        self.frame_counts: Dict[str, int] = {}
        
    def add_camera(self, config: CameraConfig) -> bool:
        """Add a camera to be monitored."""
        if config.camera_id in self.cameras:
            print(f"Camera {config.camera_id} already exists. Use update_camera instead.")
            return False
        
        self.cameras[config.camera_id] = config
        self.frame_buffers[config.camera_id] = queue.Queue(maxsize=config.buffer_size)
        self.stop_flags[config.camera_id] = False
        self.frame_counts[config.camera_id] = 0
        return True
    
    def update_camera(self, config: CameraConfig) -> bool:
        """Update camera configuration."""
        if config.camera_id not in self.cameras:
            print(f"Camera {config.camera_id} doesn't exist. Use add_camera instead.")
            return False
        
        # Stop existing thread if running
        if config.camera_id in self.threads and self.threads[config.camera_id].is_alive():
            self.stop_flags[config.camera_id] = True
            self.threads[config.camera_id].join(timeout=3.0)
        
        # Update configuration
        self.cameras[config.camera_id] = config
        
        # Update buffer size if needed
        old_buffer = self.frame_buffers[config.camera_id]
        if old_buffer.maxsize != config.buffer_size:
            # Create new buffer with updated size
            new_buffer = queue.Queue(maxsize=config.buffer_size)
            # Clear old buffer
            while not old_buffer.empty():
                try:
                    old_buffer.get_nowait()
                except queue.Empty:
                    break
            self.frame_buffers[config.camera_id] = new_buffer
        
        # Restart camera if it was enabled
        if config.enabled:
            self._start_camera_thread(config.camera_id)
        
        return True
    
    def start_all_cameras(self):
        """Start capturing from all enabled cameras."""
        for camera_id, config in self.cameras.items():
            print(f"Starting camera {camera_id} with URL {config.url}")
            if config.enabled and (camera_id not in self.threads or not self.threads[camera_id].is_alive()):
                self._start_camera_thread(camera_id)
    
    def stop_all_cameras(self):
        """Stop all running camera threads."""
        for camera_id in self.threads.keys():
            if self.threads[camera_id].is_alive():
                self.stop_flags[camera_id] = True
                
        for camera_id in self.threads.keys():
            if self.threads[camera_id].is_alive():
                self.threads[camera_id].join(timeout=3.0)
                
        # Close all stream connections
        for stream in self.streams.values():
            if stream is not None:
                stream.release()
                
        self.streams.clear()
    
    def _start_camera_thread(self, camera_id: str):
        """Start a thread for capturing from a specific camera."""
        if camera_id not in self.cameras:
            print(f"Camera {camera_id} not found.")
            return
        
        config = self.cameras[camera_id]
        if not config.enabled:
            print(f"Camera {camera_id} is disabled.")
            return
        
        # Reset stop flag
        self.stop_flags[camera_id] = False
        
        # Create and start thread
        thread = threading.Thread(
            target=self._capture_frames,
            args=(camera_id,),
            daemon=True
        )
        self.threads[camera_id] = thread
        thread.start()
    
    def _capture_frames(self, camera_id: str):
        """Thread function to capture frames from a camera."""
        config = self.cameras[camera_id]
        buffer = self.frame_buffers[camera_id]
        
        # Parse the URL (could be a number for webcam)
        try:
            if config.url.isdigit():
                # Local webcam
                for _ in range(3):  # Retry up to 3 times
                    stream = cv2.VideoCapture(int(config.url), cv2.CAP_DSHOW)
                    if stream.isOpened():
                        break
                    time.sleep(0.5)
            else:
                # IP camera, RTSP stream, or video file
                stream = cv2.VideoCapture(config.url)
                stream.set(cv2.CAP_PROP_BUFFERSIZE, 3)
                
            
            if not stream.isOpened():
                print(f"Failed to open {config.camera_id} after retries")
                return
        
            time.sleep(1.0)
                
        except Exception as e:
            print(f"Error opening video stream for camera {camera_id}: {str(e)}")
            return
        
        # Store the stream
        self.streams[camera_id] = stream
        
        # Check if stream opened successfully
        if not stream.isOpened():
            print(f"Could not open stream for camera {camera_id}")
            return
        
        # Set resolution
        stream.set(cv2.CAP_PROP_FRAME_WIDTH, config.resolution[0])
        stream.set(cv2.CAP_PROP_FRAME_HEIGHT, config.resolution[1])
        
        frame_interval = 1.0 / config.fps_target
        self.last_frame_time[camera_id] = time.time()
        
        print(f"Started capturing from camera {camera_id}")
        
        while not self.stop_flags[camera_id]:
            # Control frame rate
            current_time = time.time()
            elapsed = current_time - self.last_frame_time[camera_id]
            
            if elapsed < frame_interval:
                time.sleep(0.001)
                continue
            
            # Capture frame
            ret, frame = stream.read()
            if not ret:
                print(f"Failed to capture frame from camera {camera_id}")
                # Attempt to reconnect for IP cameras
                time.sleep(1.0)
                stream.release()
                try:
                    stream = cv2.VideoCapture(config.url)
                    self.streams[camera_id] = stream
                except Exception as e:
                    print(f"Error reconnecting to camera {camera_id}: {str(e)}")
                continue
            
            # Update timing and counts
            self.last_frame_time[camera_id] = current_time
            self.frame_counts[camera_id] += 1
            
            # Resize if necessary
            actual_height, actual_width = frame.shape[:2]
            if (actual_width, actual_height) != config.resolution:
                frame = cv2.resize(frame, config.resolution)
            
            # Apply zone of interest mask if specified
            # if config.zone_of_interest:
            #     mask = np.zeros(frame.shape[:2], dtype=np.uint8)
            #     points = np.array(config.zone_of_interest, dtype=np.int32)
            #     cv2.fillPoly(mask, [points], 255)
            #     frame = cv2.bitwise_and(frame, frame, mask=mask)
            
            # Create frame data object
            frame_data = FrameData(
                frame=frame,
                camera_id=camera_id,
                timestamp=current_time,
                frame_number=self.frame_counts[camera_id],
                resolution=config.resolution
            )
            
            # Add to buffer, dropping oldest frame if full
            if buffer.full():
                try:
                    buffer.get_nowait()  # Remove oldest frame
                except queue.Empty:
                    pass  # Buffer was emptied by another thread
            
            try:
                buffer.put(frame_data, block=False)
            except queue.Full:
                print(f"Warning: Frame buffer for camera {camera_id} is full")
        
        # Clean up
        stream.release()
        self.streams[camera_id] = None
        print(f"Stopped capturing from camera {camera_id}")
    
    def get_latest_frame(self, camera_id: str) -> Optional[FrameData]:
        if camera_id not in self.frame_buffers:
            return None
        
        buffer = self.frame_buffers[camera_id]
        if buffer.empty():
            return None
        
        frames = []
        try:
            while not buffer.empty():
                frames.append(buffer.get_nowait())
        except queue.Empty:
            pass
        
        # Put all but the newest frame back
        for frame in frames[:-1]:
            try:
                buffer.put_nowait(frame)
            except queue.Full:
                pass
                
        return frames[-1] if frames else None
    
    def get_all_frames(self, camera_id: str) -> List[FrameData]:
        """Get all frames in the buffer for a camera."""
        if camera_id not in self.frame_buffers:
            return []
        
        buffer = self.frame_buffers[camera_id]
        frames = []
        
        try:
            while not buffer.empty():
                frames.append(buffer.get_nowait())
        except queue.Empty:
            pass
        
        # Put all frames back
        for frame in frames:
            try:
                buffer.put(frame, block=False)
            except queue.Full:
                # If buffer is full, prioritize newer frames
                break
        
        return frames
    
    def get_camera_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status information for all cameras."""
        status = {}
        for camera_id, config in self.cameras.items():
            is_running = (camera_id in self.threads and self.threads[camera_id].is_alive())
            fps = 0
            if camera_id in self.last_frame_time and is_running:
                # Calculate actual FPS based on frame count and time
                elapsed = time.time() - self.last_frame_time[camera_id]
                if elapsed > 0 and self.frame_counts[camera_id] > 0:
                    fps = self.frame_counts[camera_id] / elapsed
            
            buffer_usage = 0
            if camera_id in self.frame_buffers:
                buffer = self.frame_buffers[camera_id]
                buffer_usage = buffer.qsize() / buffer.maxsize if buffer.maxsize > 0 else 0
            
            status[camera_id] = {
                "enabled": config.enabled,
                "running": is_running,
                "fps": round(fps, 2),
                "resolution": config.resolution,
                "buffer_usage": round(buffer_usage * 100, 1),  # as percentage
                "frame_count": self.frame_counts.get(camera_id, 0)
            }
        
        return status
    
    def is_camera_running(self, camera_id: str) -> bool:
        """Check if a camera is currently running"""
        if camera_id not in self.cameras:
            return False
        
        # Assuming self.threads contains the active camera threads
        return (camera_id in self.threads and self.threads[camera_id].is_alive())
    
video_capture  = VideoCapture()