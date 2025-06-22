from ast import List
from datetime import datetime
from pathlib import Path
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

class DetectionEvent:
    """Represents a detection event"""
    id: Optional[int] = None
    camera_id: str = ""
    timestamp: float = 0.0
    detection_type: str = ""
    confindence: float = 0.0
    bounding_box: Optional[list[int]] = None
    image_path: str = ""
    video_clip_path: str = ""
    notified: bool = False
    
    def __post_init__(self):
        """Post-initialization to ensure bounding_box is a list"""
        if self.bounding_box is None:
            self.bounding_box = []
            
class DetectionEventManager:
    """Manages detection events"""
    
    def __init__(self, storage_path: str = ""):
        self.storage_path = Path(storage_path)
        self.events = []
    
        self.images_path = self.storage_path / "detection_images"
        self.videos_path = self.storage_path / "detection_videos"
        
        self.images_path.mkdir(exist_ok=True)
        self.videos_path.mkdir(exist_ok=True)
        
        # Recording settings
        self.record_human_detections = True
        self.record_all_detections = False
        self.min_confidence = 0.5
        self.video_duration = 10
        self.cleanup_days = 30
        
        # Active video recordings
        self.active_recordings: Dict[str, Dict] = {}
        self.recording_lock = threading.Lock()
        
        self.video_capture = None
        self.inference_engine = None
        
    def set_inference_engine(self, inference_engine):
        """Set inference engine instance"""
        self.inference_engine = inference_engine
        print("Inference engine connected to detection manager")
        
    def should_record_detection(self, detection: Dict[str, Any]) -> bool:
        """Determine if a detection should be recorded"""
        detection_type = detection.get('name', '').lower()
        confidence = detection.get('conf', 0.0)
        
        # Check confidence threshold
        if confidence < self.min_confidence:
            return False
            
        # Check if we should record this type
        if self.record_all_detections:
            return True
            
        if self.record_human_detections and detection_type == 'person':
            return True
            
        return False
    
    def record_detection(self, camera_id:str, frame_data, detection: Dict[str,Any]) -> DetectionEvent:
        """Record a detection event"""
        if not self.should_record_detection(detection):
            return None
        try:
            event = DetectionEvent(
                camera_id=camera_id,
                timestamp=frame_data.timestamp,
                detection_type=detection.get('name', ''),
                confindence=detection.get('conf', 0.0),
                bounding_box=detection.get('box', []).tolist() if hasattr(detection.get('box', []), 'tolist') else detection.get('box', [])
            )
            
            # Save image
            event.image_path = self._save_detection_image(camera_id, frame_data.frame, detection, event.timestamp)
            
            if(event.detection_type == 'person'):
                self._start_video_recording(camera_id, event.timestamp)
                
            return event
        except Exception as e:
            print(f"Error recording detection: {e}")
            return None
    def _save_detection_image(self, camera_id: str, frame: np.ndarray, detection: Dict, timestamp: float) -> str:
        """Save detection image with bounding box highlighted"""
        try:
            # Create annotated frame
            annotated_frame = frame.copy()
            box = detection.get('box', [])
            
            if len(box) >= 4:
                # Draw bounding box
                cv2.rectangle(annotated_frame, (int(box[0]), int(box[1])), 
                            (int(box[2]), int(box[3])), (0, 255, 0), 3)
                
                # Add label
                label = f"{detection.get('name', '')} {detection.get('conf', 0):.2f}"
                cv2.putText(annotated_frame, label, (int(box[0]), int(box[1]) - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Add timestamp
            timestamp_str = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
            cv2.putText(annotated_frame, timestamp_str, (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Save image
            filename = f"{camera_id}_{int(timestamp)}_{detection.get('name', 'unknown')}.jpg"
            image_path = self.images_path / filename
            cv2.imwrite(str(image_path), annotated_frame)
            
            return str(image_path)
            
        except Exception as e:
            print(f"Error saving detection image: {e}")
            return ""
        
    def _start_video_recording(self, camera_id: str, trigger_timestamp: float):
        """Start video recording for a detection event"""
        with self.recording_lock:
            # Check if already recording for this camera
            if camera_id in self.active_recordings:
                # Extend existing recording
                self.active_recordings[camera_id]['end_time'] = trigger_timestamp + self.video_duration
                return
                
            # Start new recording
            recording_info = {
                'start_time': trigger_timestamp - 5,  # Include 5 seconds before detection
                'end_time': trigger_timestamp + self.video_duration,
                'trigger_timestamp': trigger_timestamp,
                'frames': [],
                'output_path': self.videos_path / f"{camera_id}_{int(trigger_timestamp)}_detection.mp4"
            }
            
            self.active_recordings[camera_id] = recording_info
            
            # Start recording thread
            thread = threading.Thread(
                target=self._video_recording_thread,
                args=(camera_id,),
                daemon=True
            )
            thread.start()
            
    def _video_recording_thread(self, camera_id: str):
        """Thread to handle video recording"""
        try:
            recording_info = self.active_recordings[camera_id]
            if not recording_info:
                return

            frames_collected = []
            start_time = recording_info['start_time']
            end_time = recording_info['end_time']
            
            while time.time() < end_time:
                if self.inference_engine:
                    frame_data =  self.inference_engine.get_latest_results(camera_id)
                
                if frame_data and frame_data.timestamp >= start_time:
                    frames_collected.append((frame_data.frame.copy(), frame_data.timestamp))
                time.sleep(0.1)
                
            if frames_collected:
                self._save_video_Clip(
                    frames_collected,
                    recording_info['output_path']
                )
        except Exception as e:
            print(f"Error in video recording thread for camera {camera_id}: {e}")
            
        finally:
            with self.recording_lock:
                if camera_id in self.active_recordings:
                    del self.active_recordings[camera_id]
                    
    def _save_video_clip(self, output_path: Path, frames:  List[Tuple[np.ndarray, float]]):
        """Save collected frames as video clip"""
        if not frames:
            return
            
        try:
            # Get video properties from first frame
            first_frame = frames[0][0]
            height, width = first_frame.shape[:2]
            
            # Create video writer
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            fps = 20  # Target FPS for recorded video
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
            
            # Write frames
            for frame, timestamp in frames:
                writer.write(frame)
                
            writer.release()
            
        except Exception as e:
            print(f"Error saving video clip: {e}")