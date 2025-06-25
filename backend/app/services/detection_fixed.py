from ast import List
from datetime import datetime
import json
import os
from pathlib import Path
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from sqlalchemy.orm import Session

from ..models.FrameData import FrameData
from ..core.database import Detection, Media, sessionLocal

class DetectionEvent:
    """Represents a detection event"""
    
    def __init__(self, camera_id: str = "", timestamp: float = 0.0, detection_type: str = "", 
                 confidence: float = 0.0, bounding_box: Optional[List[int]] = None,
                 image_path: str = "", video_clip_path: str = "", notified: bool = False,
                 id: Optional[int] = None):
        self.id = id
        self.camera_id = camera_id
        self.timestamp = timestamp
        self.detection_type = detection_type
        self.confidence = confidence  # Fixed spelling
        self.bounding_box = bounding_box if bounding_box is not None else []
        self.image_path = image_path
        self.video_clip_path = video_clip_path
        self.notified = notified
            
class DetectionEventManager:
    """Manages detection events"""
    
    def __init__(self, storage_path: str = "data/storage"):
        self.storage_path = Path(storage_path) if storage_path else Path("data/storage")
        self.events = []
    
        # Simplified storage structure - no raw/annotated separation
        self.images_path = self.storage_path / "images"
        self.videos_path = self.storage_path / "videos"
        self.thumbnails_path = self.storage_path / "thumbnails"
        
        # Create directories if they don't exist
        self.images_path.mkdir(parents=True, exist_ok=True)
        self.videos_path.mkdir(parents=True, exist_ok=True)
        self.thumbnails_path.mkdir(parents=True, exist_ok=True)
        
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
        
    def _get_db(self) -> Session:
        """Get a database session"""
        return sessionLocal()
    
    def should_record_detection(self, detection: Dict[str, Any]) -> bool:
        """Records a detection event if it meets criteria"""
        detection_type = detection.get('name', '').lower()
        confidence = detection.get('conf', 0.0)
        
        # Check confidence threshold
        if confidence < self.min_confidence:
            return False
            
        if self.record_human_detections and detection_type == 'person':
            return True
            
        return False
    
    def record_detection(self, camera_id: str, frame_data: FrameData, detection: Dict[str, Any]) -> Optional[DetectionEvent]:
        """Record a detection event"""
        if not self.should_record_detection(detection):
            return None
        try:
            # Create event object
            event = DetectionEvent(
                camera_id=camera_id,
                timestamp=frame_data.timestamp,
                detection_type=detection.get('name', ''),
                confidence=detection.get('conf', 0.0),
                bounding_box=detection.get('box', []).tolist() if hasattr(detection.get('box', []), 'tolist') else detection.get('box', [])
            )
            
            # Generate date-based path structure
            date_parts = datetime.fromtimestamp(event.timestamp).strftime("%Y/%m/%d").split('/')
            
            # Create database record first
            db = self._get_db()
            db_detection = Detection(
                camera_id=camera_id,
                timestamp=event.timestamp,
                detection_type=event.detection_type,
                confidence=event.confidence,
                bounding_box=json.dumps(event.bounding_box),
                notified=False
            )
            db.add(db_detection)
            db.commit()
            db.refresh(db_detection)
            event.id = db_detection.id
            
            # Save annotated image with date-based organization
            img_dir = self.images_path / camera_id / date_parts[0] / date_parts[1] / date_parts[2]
            img_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate file name
            base_filename = f"{camera_id}_{int(event.timestamp)}_{db_detection.id}_{event.detection_type}.jpg"
            img_path = img_dir / base_filename
            
            # Create annotated frame and save
            annotated_frame = self._annotate_frame(frame_data.frame, detection, event.timestamp)
            cv2.imwrite(str(img_path), annotated_frame)
            
            # Store relative path in database
            img_rel_path = str(img_path.relative_to(self.storage_path))
            
            # Create thumbnail
            thumbnail_dir = self.thumbnails_path / camera_id / date_parts[0] / date_parts[1] / date_parts[2]
            thumbnail_dir.mkdir(parents=True, exist_ok=True)
            thumbnail_path = thumbnail_dir / base_filename
            self._create_thumbnail(annotated_frame, thumbnail_path)
            thumbnail_rel_path = str(thumbnail_path.relative_to(self.storage_path))
            
            # Save media records
            image_media = Media(
                camera_id=camera_id,
                detection_id=db_detection.id,
                media_type="image",
                path=img_rel_path,
                timestamp=event.timestamp,
                size_bytes=os.path.getsize(img_path)
            )
            
            thumbnail_media = Media(
                camera_id=camera_id,
                detection_id=db_detection.id,
                media_type="thumbnail",
                path=thumbnail_rel_path,
                timestamp=event.timestamp,
                size_bytes=os.path.getsize(thumbnail_path)
            )
            
            db.add(image_media)
            db.add(thumbnail_media)
            db.commit()
            
            # Update event with path
            event.image_path = str(img_path)
            
            # If person detected, start video recording
            if event.detection_type.lower() == 'person':
                self._start_video_recording(camera_id, event.timestamp, db_detection.id)
                
            return event
            
        except Exception as e:
            print(f"Error recording detection: {e}")
            import traceback
            traceback.print_exc()
            return None
            
    def _annotate_frame(self, frame: np.ndarray, detection: Dict, timestamp: float) -> np.ndarray:
        """Create annotated frame with detection overlay"""
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
        
        return annotated_frame
        
    def _create_thumbnail(self, frame: np.ndarray, output_path: Path, size=(320, 240)):
        """Create thumbnail image"""
        thumbnail = cv2.resize(frame, size)
        cv2.imwrite(str(output_path), thumbnail)
        
    def _start_video_recording(self, camera_id: str, trigger_timestamp: float, detection_id: int):
        """Start video recording for a detection event"""
        with self.recording_lock:
            date_parts = datetime.fromtimestamp(trigger_timestamp).strftime("%Y/%m/%d").split('/')
            
            video_dir = self.videos_path / camera_id / date_parts[0] / date_parts[1] / date_parts[2]
            video_dir.mkdir(parents=True, exist_ok=True)
            
            # Check if already recording for this camera
            if camera_id in self.active_recordings:
                # Extend existing recording
                self.active_recordings[camera_id]['end_time'] = trigger_timestamp + self.video_duration
                return
                
            # Start new recording
            recording_info = {
                'start_time': trigger_timestamp - 5,
                'end_time': trigger_timestamp + self.video_duration,
                'trigger_timestamp': trigger_timestamp,
                'detection_id': detection_id,
                'frames': [],
                'output_path': video_dir / f"{camera_id}_{int(trigger_timestamp)}_{detection_id}_clip.mp4"
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
            detection_id = recording_info['detection_id']
            
            while time.time() < end_time:
                if self.inference_engine:
                    frame_data = self.inference_engine.get_latest_results(camera_id)
                
                if frame_data and frame_data.timestamp >= start_time:
                    frames_collected.append((frame_data.frame.copy(), frame_data.timestamp))
                time.sleep(0.1)
                
            if frames_collected:
                self._save_video_clip(
                    frames_collected,
                    recording_info['output_path'],
                    camera_id,
                    detection_id
                )
        except Exception as e:
            print(f"Error in video recording thread for camera {camera_id}: {e}")
            
        finally:
            with self.recording_lock:
                if camera_id in self.active_recordings:
                    del self.active_recordings[camera_id]
                    
    def _save_video_clip(self, frames: List[Tuple[np.ndarray, float]], output_path: Path, camera_id: str, detection_id: int):
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
            
            # Create thumbnail from middle frame
            middle_index = len(frames) // 2
            middle_frame = frames[middle_index][0]
            thumbnail_path = self.thumbnails_path / f"{output_path.stem}_thumbnail.jpg"
            self._create_thumbnail(middle_frame, thumbnail_path)
            
            # Save to database
            file_size = os.path.getsize(output_path)
            duration = len(frames) / fps
            timestamp = frames[0][1]
            
            db = self._get_db()
            
            video_media = Media(
                camera_id=camera_id,
                detection_id=detection_id,
                media_type='video',
                path=str(output_path.relative_to(self.storage_path)),
                timestamp=timestamp,
                duration=duration,
                size_bytes=file_size
            )
            db.add(video_media)
            
            thumbnail_media = Media(
                camera_id=camera_id,
                detection_id=detection_id,
                media_type='video_thumbnail',
                path=str(thumbnail_path.relative_to(self.storage_path)),
                timestamp=timestamp,
                size_bytes=os.path.getsize(thumbnail_path)
            )
            db.add(thumbnail_media)
            db.commit()
            
            print(f"Video saved: {output_path}")
            
        except Exception as e:
            print(f"Error saving video clip: {e}")
            import traceback
            traceback.print_exc()
