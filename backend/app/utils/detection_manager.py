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


#Temporary fix for circular dependency injection
from ..core.database.connection import get_db

from ..services.camera_service import camera_service
from ..services.media_service import media_service

from ..services.detection_service import detection_service

from ..schema.FrameData import FrameData
from ..schema.detection import Detection, DetectionCreate
from ..schema.media import  MediaCreate
from ..Settings import settings

class DetectionEventManager:
    """Manages detection events"""
    def __init__(self):
        self.db = next(get_db())  # Get actual session, not generator
        self.storage_path = Path(settings.STORAGE_DIR)
        self.events = []
        self.active_recordings: Dict[str, Dict] = {}
        self.recording_lock = threading.Lock()
        self.video_duration = 30
        self.min_confidence = settings.MIN_CONFIDENCE if hasattr(settings, 'MIN_CONFIDENCE') else 0.5
        
        self.detection_cooldown = 30
        self.last_detection_time: Dict[str, float] = {}
        self.detection_cache_lock = threading.Lock()
        
        self.video_capture = None
        self.inference_engine = None
    
    def should_record_detection(self, detection: Dict[str, Any]) -> bool:
        """Check if detection meets criteria for recording"""
        detection_type = detection.get('name', '').lower()
        confidence = detection.get('conf', 0.0)
        
        if confidence < self.min_confidence:
            return False
        
        if detection_type == 'person':
            return True
        
        return False  # Add explicit return for other types
    
    def is_in_cooldown(self, camera_id: str, detection: Dict[str, Any]) -> bool:
        """Check if detection is in cooldown period"""
        current_time = time.time()
        detection_type = detection.get('name', '').lower()
        
        with self.detection_cache_lock:
            cooldown_key = f"{camera_id}_{detection_type}"
            if cooldown_key in self.last_detection_time:
                time_since_last = current_time - self.last_detection_time[cooldown_key]
                if time_since_last < self.detection_cooldown:
                    return True
                
            self.last_detection_time[cooldown_key] = current_time
            return False

    #TODO: Find a type safe way to handle inject InferenceEngine into this class that avoid circular dependency
    def record_detection(self, camera_id: str, frame_data: FrameData, detection: Dict[str, Any], inference_service: Any ) -> Optional[Detection]:
        """Record a detection event"""
        if inference_service:
            self.inference_engine = inference_service
        if not self.should_record_detection(detection):
            return None
            
        if self.is_in_cooldown(camera_id, detection):
            return None
            
        try:
            
            detection_event = DetectionCreate(
                camera_id=int(camera_id),
                timestamp=frame_data.timestamp,
                detection_type=detection.get('name', ''),
                confidence=detection.get('conf', 0.0)
            )
            
            date_parts = datetime.fromtimestamp(detection_event.timestamp).strftime("%Y/%m/%d").split('/')
            print(f"Camera Service: {camera_service}")
            camera = camera_service.get_by_camera_id(self.db, camera_id)
            try:
                db_detection =  detection_service.create_detection(self.db, detection_event)

                img_dir = settings.STORAGE_IMG_DIR / camera.name / date_parts[0] / date_parts[1] / date_parts[2]
                img_dir.mkdir(parents=True, exist_ok=True)
                
                base_filename = f"{camera_id}_{int(detection_event.timestamp)}_{detection_event.detection_type}.jpg"
                img_path = img_dir / base_filename
                
                annotated_frame = self._annotate_frame(frame_data.frame, detection, detection_event.timestamp)
                cv2.imwrite(str(img_path), annotated_frame)
                
                img_rel_path = str(img_path.relative_to(self.storage_path))
                
                # thumbnail_dir = settings.STORAGE_THUMBNAIL_DIR / camera.name / date_parts[0] / date_parts[1] / date_parts[2]
                # thumbnail_path = thumbnail_dir / base_filename
                # self._create_thumbnail(annotated_frame, thumbnail_path)
                # thumbnail_rel_path = str(thumbnail_path.relative_to(self.storage_path))
                
                print(f"Saving detection: {db_detection.id}")
                
                image_media = MediaCreate(
                    camera_id=int(camera_id),
                    detection_id=db_detection.id,
                    media_type="image",
                    path=img_rel_path,
                    timestamp=detection_event.timestamp,
                    size_bytes=os.path.getsize(img_path)
                )
                
                print(f"Saving image media: {image_media}")
                
                media_service.create_media(self.db, image_media)
                
                # thumbnail_media = MediaCreate(
                #     camera_id=int(camera_id),
                #     detection_id=db_detection.id,
                #     media_type="thumbnail",
                #     path=thumbnail_rel_path,
                #     timestamp=detection_event.timestamp,
                #     size_bytes=os.path.getsize(thumbnail_path)
                # )
                
                # media_service.create_media(self.db, thumbnail_media)
                
                self._start_video_recording(camera_id, detection_event.timestamp, db_detection.id if db_detection else 1)
                
                return db_detection
                
            except Exception as e:
                print(f"Error saving detection to database: {e}")
                import traceback
                traceback.print_exc()
                return None
                
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
        
    # def _create_thumbnail(self, frame: np.ndarray, output_path: Path, size=(320, 240)):
    #     """Create thumbnail image"""
    #     thumbnail = cv2.resize(frame, size)
    #     cv2.imwrite(str(output_path), thumbnail)

    def _start_video_recording(self, camera_id: str, trigger_timestamp: float, detection_id: int = 1):
        """Start video recording for a detection event"""
        camera = camera_service.get_by_camera_id(self.db, camera_id)
        with self.recording_lock:
            date_parts = datetime.fromtimestamp(trigger_timestamp).strftime("%Y/%m/%d").split('/')
            
            video_dir = settings.STORAGE_VIDEO_DIR / camera.name / date_parts[0] / date_parts[1] / date_parts[2]
            video_dir.mkdir(parents=True, exist_ok=True)
            
            if camera_id in self.active_recordings:
                self.active_recordings[camera_id]['end_time'] = trigger_timestamp + self.video_duration
                return
                
            recording_info = {
                'start_time': trigger_timestamp - 5,
                'end_time': trigger_timestamp + self.video_duration,
                'trigger_timestamp': trigger_timestamp,
                'detection_id': detection_id,
                'frames': [],
                'output_path': video_dir / f"{camera_id}_{int(trigger_timestamp)}_{detection_id}_clip.mp4"
            }
            self.active_recordings[camera_id] = recording_info
            
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
            print(f"Recording video for camera {camera_id} from {start_time} to {end_time}, detection ID: {detection_id}")
            while time.time() < end_time:
                frame_data = None
                print(f"Inference_instance: {self.inference_engine}")
                if self.inference_engine:
                    frame_data = self.inference_engine.get_latest_results(camera_id)
                    print(f"Frame data for camera {camera_id}: {frame_data}")
                if frame_data and getattr(frame_data, 'timestamp', 0) >= start_time:
                    frames_collected.append((frame_data.frame.copy(), frame_data.timestamp))
                
                time.sleep(0.1)
            
            print(f"Collected {len(frames_collected)} frames for camera {camera_id}")
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
            first_frame = frames[0][0]
            height, width = first_frame.shape[:2]
            
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            fps = 20
            writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
            
            for frame, timestamp in frames:
                writer.write(frame)
                
            writer.release()

            file_size = os.path.getsize(output_path)
            duration = len(frames) / fps
            timestamp = frames[0][1]
            
            video_media = MediaCreate(
                camera_id=int(camera_id),
                detection_id=detection_id,
                media_type='video',
                path=str(output_path.relative_to(self.storage_path)),
                timestamp=timestamp,
                duration=duration,
                size_bytes=file_size
            )
            media_service.create_media(self.db, video_media)
            
            print(f"Video saved: {output_path}")
            
        except Exception as e:
            print(f"Error saving video clip: {e}")
            import traceback
            traceback.print_exc()

detection_manager = DetectionEventManager()