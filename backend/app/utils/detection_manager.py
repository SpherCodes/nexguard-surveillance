from ast import List
import asyncio
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


from ..core.models import User



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
    def __init__(self, alert_service):
        self.db = next(get_db())  # Get actual session, not generator
        self.storage_path = Path(settings.STORAGE_DIR).resolve()
        self.events = []
        self.alert_service = alert_service
        self.active_recordings: Dict[str, Dict] = {}
        self.recording_lock = threading.Lock()
        self.video_duration = 30
        self.min_confidence = settings.MIN_CONFIDENCE if hasattr(settings, 'MIN_CONFIDENCE') else 0.5
        
        self.detection_cooldown = settings.DETECTION_COOLDOWN if hasattr(settings, 'DETECTION_COOLDOWN') else 30
        self.enable_alerts = settings.ENABLE_ALERT_NOTIFICATIONS if hasattr(settings, 'ENABLE_ALERT_NOTIFICATIONS') else True
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
    def  record_detection(self, camera_id: str, frame_data: FrameData, detection: Dict[str, Any], inference_service: Any ) -> Optional[Detection]:
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
            
            # Create detection record first
            db_detection = detection_service.create_detection(self.db, detection_event)
            
            # Send Firebase FCM alert notification
            if self.alert_service and db_detection and self.enable_alerts:
                try:
                    camera = camera_service.get_by_camera_id(self.db, camera_id)
                    camera_name = camera.name if camera else f"Camera {camera_id}"
                    
                    # Send alert using the synchronous wrapper (schedules async task)
                    self.send_detection_alert_sync(db_detection, camera_name)
                    
                except Exception as e:
                    print(f"Error sending alert notifications: {e}")
            else:
                print("Alert service is not available or detection creation failed - notifications not sent")

            # Continue with media processing
            date_parts = datetime.fromtimestamp(detection_event.timestamp).strftime("%Y/%m/%d").split('/')
            camera = camera_service.get_by_camera_id(self.db, camera_id)
            
            try:
                # Media processing for the already created detection
                img_dir = settings.STORAGE_IMG_DIR / camera.name / date_parts[0] / date_parts[1] / date_parts[2]
                img_dir.mkdir(parents=True, exist_ok=True)
                
                base_filename = f"{camera_id}_{int(detection_event.timestamp)}_{detection_event.detection_type}.jpg"
                img_path = img_dir / base_filename
                
                annotated_frame = self._annotate_frame(frame_data.frame, detection, detection_event.timestamp)
                cv2.imwrite(str(img_path), annotated_frame)
                
                # Use the already resolved storage path; robust relative calc
                img_abs = img_path.resolve()
                try:
                    img_rel_path = str(img_abs.relative_to(self.storage_path))
                except ValueError:
                    # Fallback: compute a relative path via os.path.relpath (handles drive/case issues)
                    img_rel_path = os.path.relpath(str(img_abs), start=str(self.storage_path))
                
                # thumbnail_dir = settings.STORAGE_THUMBNAIL_DIR / camera.name / date_parts[0] / date_parts[1] / date_parts[2]
                # thumbnail_path = thumbnail_dir / base_filename
                # self._create_thumbnail(annotated_frame, thumbnail_path)
                # thumbnail_rel_path = str(thumbnail_path.relative_to(self.storage_path))
                
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
            
    async def send_detection_alert(self, detection: Detection, camera_name: str = None) -> bool:
        """Send Firebase FCM alert for a detection to all active users"""
        if not self.alert_service:
            print("Alert service not available")
            return False
            
        try:
            # Determine zone name
            zone_name = camera_name or f"Camera {detection.camera_id}"
            
            # Get all active users
            users = self.db.query(User).filter(User.is_active == True).all()
            
            notification_sent = False
            # Prepare notification content
            notif_title = "🚨 Security Alert"
            notif_body = f"{detection.detection_type.title()} detected in {zone_name} (Confidence: {detection.confidence:.1%})"
            notif_data = {
                "detection_id": str(detection.id),
                "camera_id": str(detection.camera_id),
                "detection_type": detection.detection_type,
                "confidence": str(detection.confidence),
                "timestamp": str(detection.timestamp),
                "zone_name": zone_name,
                "alert_type": "detection"
            }
            
            # Also send to alerts topic for subscribed users
            try:
                await asyncio.to_thread(self.alert_service.send_alert, self.db, detection)
            except Exception as topic_error:
                print(f"Error sending topic alert: {topic_error}")
            
            return notification_sent
        except Exception as e:
            print(f"Error in send_detection_alert: {e}")
            import traceback
            traceback.print_exc()
            return False

    def send_detection_alert_sync(self, detection: Detection, camera_name: str = None) -> None:
        """Synchronous wrapper for sending detection alerts"""
        try:
            
            # Try to get current event loop, create new one if none exists
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If loop is running, create a task
                    asyncio.create_task(self.send_detection_alert(detection, camera_name))
                else:
                    # If loop exists but not running, run the coroutine
                    loop.run_until_complete(self.send_detection_alert(detection, camera_name))
            except RuntimeError:
                # No event loop exists, create a new one
                asyncio.run(self.send_detection_alert(detection, camera_name))
                
        except Exception as e:
            print(f"Error in send_detection_alert_sync: {e}")
            
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
            while time.time() < end_time:
                frame_data = None
                if self.inference_engine:
                    frame_data = self.inference_engine.get_latest_results(camera_id)
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
            
        except Exception as e:
            print(f"Error saving video clip: {e}")
            import traceback
            traceback.print_exc()

    async def send_test_alert(self, user_id: int = None, message: str = "Test Alert") -> bool:
        """Send a test alert to verify the notification system"""
        if not self.alert_service:
            print("Alert service not available for test")
            return False
            
        try:
            # Determine recipients
            if user_id:
                user_obj = self.db.query(User).filter(User.id == user_id).first()
                users = [user_obj] if user_obj else []
            else:
                users = self.db.query(User).filter(User.is_active == True).all()

            success = False
            # Send a test notification to each user
            for user in users:
                try:
                    # Use to_thread to run blocking DB + network call
                    message_ids = await asyncio.to_thread(
                        self.alert_service.send_notification_to_user,
                        self.db,
                        user.id,
                        title="🧪 Test Alert",
                        body=message,
                        data={
                            "alert_type": "test",
                            "timestamp": str(time.time()),
                            "message": message
                        }
                    )
                    if message_ids:
                        print(f"Test alert sent to user {user.id}")
                        success = True
                except Exception as user_error:
                    print(f"Error sending test alert to user {user.id}: {user_error}")
            return success
        except Exception as e:
            print(f"Error in send_test_alert: {e}")
            import traceback
            traceback.print_exc()
            return False

    def send_test_alert_sync(self, user_id: int = None, message: str = "Test Alert") -> bool:
        """Synchronous wrapper for sending test alerts"""
        try:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.create_task(self.send_test_alert(user_id, message))
                    return True
                else:
                    return loop.run_until_complete(self.send_test_alert(user_id, message))
            except RuntimeError:
                return asyncio.run(self.send_test_alert(user_id, message))
                
        except Exception as e:
            print(f"Error in send_test_alert_sync: {e}")
            return False

    def get_alert_service_status(self) -> Dict[str, Any]:
        """Get status information about the alert service"""
        status = {
            "alert_service_available": self.alert_service is not None,
            "firebase_initialized": False,
            "active_users_count": 0,
            "users_with_tokens": 0
        }
        
        try:
            if self.alert_service:
                # Check if Firebase is initialized
                import firebase_admin
                status["firebase_initialized"] = len(firebase_admin._apps) > 0
                
                # Count active users
                from ..core.models import User, UserDeviceToken
                active_users = self.db.query(User).filter(User.is_active == True).count()
                status["active_users_count"] = active_users
                
                # Count users with device tokens
                users_with_tokens = self.db.query(UserDeviceToken).distinct(UserDeviceToken.user_id).count()
                status["users_with_tokens"] = users_with_tokens
                
        except Exception as e:
            print(f"Error getting alert service status: {e}")
            status["error"] = str(e)
            
        return status

# Global instance will be created through dependency injection in dependencies.py
# detection_manager = DetectionEventManager(alert_service)