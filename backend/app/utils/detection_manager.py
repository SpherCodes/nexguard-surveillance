import asyncio
import ffmpeg
import subprocess
import tempfile
from datetime import datetime
import os
from pathlib import Path
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

from ..core.database.connection import SessionLocal

from ..services.camera_service import camera_service
from ..services.media_service import media_service

from ..services.detection_service import detection_service

from ..schema.FrameData import FrameData
from ..schema.detection import Detection, DetectionCreate
from ..schema.media import MediaCreate, MediaType
from ..Settings import settings

class DetectionEventManager:
    """Manages detection events"""
    def __init__(self, alert_service):
        self.storage_path = Path(settings.STORAGE_DIR)
        self.events = []
        self.alert_service = alert_service
        self._session_factory = SessionLocal
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
    def record_detection(
    self,
    camera_id: str,
    frame_data: FrameData,
    detection: Dict[str, Any],
    inference_service: Any) -> Optional[Detection]:
        """Record a detection event"""
        if inference_service:
            self.inference_engine = inference_service
        if not self.should_record_detection(detection):
            return None
        if self.is_in_cooldown(camera_id, detection):
            return None

        detection_record: Optional[Detection] = None
        camera_display_name: Optional[str] = None

        try:
            with self._session_factory() as db:
                # --- Create detection record ---
                detection_event = DetectionCreate(
                    camera_id=int(camera_id),
                    timestamp=frame_data.timestamp,
                    detection_type=detection.get("name", ""),
                    confidence=detection.get("conf", 0.0),
                )

                db_detection = detection_service.create_detection(db, detection_event)
                if not db_detection:
                    print("Detection creation returned None")
                    return None

                detection_record = Detection.model_validate(db_detection)

                camera_obj = camera_service.get_by_camera_id(db, int(camera_id))
                camera_display_name = (
                    camera_obj.name if camera_obj and camera_obj.name else f"Camera {camera_id}"
                )
                camera_storage_name = camera_display_name or f"camera_{camera_id}"

                # Start video capture thread
                self._start_video_recording(
                    camera_id,
                    camera_storage_name,
                    detection_event.timestamp,
                    detection_record.id,
                )

                # --- Media Processing (Image) ---
                try:
                    date_parts = datetime.fromtimestamp(
                        detection_event.timestamp
                    ).strftime("%Y/%m/%d").split("/")

                    abs_img_dir = settings.STORAGE_IMG_DIR / camera_storage_name / Path(*date_parts)
                    rel_img_dir = settings.STORAGE_IMG_DIR / camera_storage_name / Path(*date_parts)
                    abs_img_dir.mkdir(parents=True, exist_ok=True)

                    base_filename = (
                        f"{camera_id}_{int(detection_event.timestamp)}_{detection_event.detection_type}.jpg"
                    )
                    abs_image_path = abs_img_dir / base_filename
                    rel_img_path = rel_img_dir / base_filename

                    annotated_frame = self._annotate_frame(
                        frame_data.frame, detection, detection_event.timestamp
                    )
                    cv2.imwrite(str(abs_image_path), annotated_frame)

                    rel_path = str(rel_img_path).replace("\\", "/")  # normalize for DB storage

                    image_media = MediaCreate(
                        camera_id=int(camera_id),
                        detection_id=detection_record.id,
                        media_type=MediaType.IMAGE,
                        path=rel_path,
                        timestamp=detection_event.timestamp,
                        size_bytes=os.path.getsize(abs_image_path),
                    )
                    media_service.create_media(db, image_media)

                except Exception as media_error:
                    print(f"Error saving detection media: {media_error}")
                    import traceback

                    traceback.print_exc()
                    return None

        except Exception as e:
            print(f"Error recording detection: {e}")
            import traceback

            traceback.print_exc()
            return None

        if self.alert_service and detection_record and self.enable_alerts:
            try:
                self.send_detection_alert_sync(detection_record, camera_display_name)
            except Exception as e:
                print(f"Error sending alert notifications: {e}")
        else:
            print("Alert service not available or detection creation failed")

        return detection_record

            
    async def send_detection_alert(self, detection: Detection, camera_name: str = None) -> bool:
        """Send Firebase FCM alert for a detection to all active users"""
        if not self.alert_service:
            print("Alert service not available")
            return False
            
        try:
            try:
                await asyncio.to_thread(self._send_alert_with_session, detection)
                return True
            except Exception as topic_error:
                print(f"Error sending topic alert: {topic_error}")
                return False
        except Exception as e:
            print(f"Error in send_detection_alert: {e}")
            import traceback
            traceback.print_exc()
            return False

    def _send_alert_with_session(self, detection: Detection) -> None:
        with self._session_factory() as db:
            self.alert_service.send_alert(db, detection)

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

    def _start_video_recording(self, camera_id: str, camera_name: str, trigger_timestamp: float, detection_id: int = 1):
        """Start video recording for a detection event"""
        if not camera_name:
            print(f"Camera name missing for {camera_id}, skipping video recording")
            return

        with self.recording_lock:
            date_parts = datetime.fromtimestamp(trigger_timestamp).strftime("%Y/%m/%d").split('/')
            abs_video_dir = settings.STORAGE_VIDEO_DIR / camera_name / Path(*date_parts)
            rel_video_dir = self.storage_path / "videos" / camera_name / Path(*date_parts)
            abs_video_dir.mkdir(parents=True, exist_ok=True)
            
            if camera_id in self.active_recordings:
                self.active_recordings[camera_id]['end_time'] = trigger_timestamp + self.video_duration
                return
            
            base_filename = f"{camera_id}_{int(trigger_timestamp)}_{detection_id}_clip.mp4"
            video_path = abs_video_dir / base_filename
            rel_path = rel_video_dir / base_filename
            
            recording_info = {
                'start_time': trigger_timestamp - 5,
                'end_time': trigger_timestamp + self.video_duration,
                'trigger_timestamp': trigger_timestamp,
                'detection_id': detection_id,
                'frames': [],
                'output_path': str(video_path).replace("\\", "/"),
                'db_path':str(rel_path).replace("\\", "/")
            }
            
            print(f"starting recording for video with info: {recording_info}")
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
            with self.recording_lock:
                recording_info = self.active_recordings.get(camera_id)
            if not recording_info:
                return

            frames_collected = []
            start_time = recording_info["start_time"]
            end_time = recording_info["end_time"]
            detection_id = recording_info["detection_id"]

            while time.time() < end_time:
                frame_data = None
                if self.inference_engine:
                    frame_data = self.inference_engine.get_latest_results(camera_id)
                if frame_data and getattr(frame_data, "timestamp", 0) >= start_time:
                    frames_collected.append((frame_data.frame.copy(), frame_data.timestamp))

                time.sleep(0.1)

            print(f"Collected {len(frames_collected)} frames for camera {camera_id}")
            if frames_collected:
                abs_video_path = Path(recording_info["output_path"])
                rel_video_path = Path(recording_info["db_path"])
                # build absolute path under storage
                abs_path = (self.storage_path / abs_video_path).resolve()

                self._save_video_clip(
                    frames_collected,
                    abs_path,
                    rel_video_path,
                    camera_id,
                    detection_id,
                )
        except Exception as e:
            print(f"Error in video recording thread for camera {camera_id}: {e}")

        finally:
            with self.recording_lock:
                if camera_id in self.active_recordings:
                    del self.active_recordings[camera_id]
    
    def _save_video_clip(
        self,
        frames: List[Tuple[np.ndarray, float]],
        output_path: Path,
        rel_path: Path,
        camera_id: str,
        detection_id: int,
    ):
        """Save collected frames as a web-compatible MP4 video using FFmpeg"""
        print(f"Saving video clip to {output_path} for camera {camera_id}")
        if not frames:
            return

        try:
            first_frame = frames[0][0]
            height, width = first_frame.shape[:2]

            # Make width and height divisible by 2 (required for H.264)
            width -= width % 2
            height -= height % 2

            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Create temporary directory for frame images
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                print(f"Using temporary directory: {temp_path}")
                
                # Save frames as individual images
                frame_files = []
                for i, (frame, timestamp) in enumerate(frames):
                    # Resize frame if needed
                    if frame.shape[1] != width or frame.shape[0] != height:
                        frame = cv2.resize(frame, (width, height))
                    
                    frame_file = temp_path / f"frame_{i:06d}.jpg"
                    cv2.imwrite(str(frame_file), frame)
                    frame_files.append(frame_file)
                
                print(f"Saved {len(frame_files)} frames to temporary directory")
                
                fps = 20
                input_pattern = str(temp_path / "frame_%06d.jpg")
                
                cmd = [
                    'ffmpeg',
                    '-y',                           # Overwrite output
                    '-framerate', str(fps),         # Input framerate
                    '-i', input_pattern,            # Input pattern
                    '-c:v', 'libx264',             # H.264 video codec
                    '-pix_fmt', 'yuv420p',         # Compatible pixel format
                    '-preset', 'fast',             # Encoding speed
                    '-crf', '23',                  # Quality (lower = better)
                    '-movflags', '+faststart',     # Optimize for streaming
                    '-profile:v', 'baseline',      # Maximum compatibility
                    '-level', '3.0',               # H.264 level
                    '-c:a', 'aac',                 # Audio codec
                    '-shortest',                   # Stop at shortest input
                    str(output_path)
                ]
                
                print(f"Running FFmpeg command: {' '.join(cmd)}")
                
                # Run FFmpeg
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    check=True
                )
                
                print(f"✓ FFmpeg video creation successful: {output_path}")
                print(f"FFmpeg output: {result.stderr}")

            # Verify the file was created
            if not output_path.exists():
                print(f"❌ Output file was not created: {output_path}")
                return
                
            # Compute metadata
            file_size = os.path.getsize(output_path)
            duration = len(frames) / fps
            timestamp = frames[0][1]

            # Compute relative path for DB storage
            rel_video_path = str(rel_path).replace("\\", "/")

            video_media = MediaCreate(
                camera_id=int(camera_id),
                detection_id=detection_id,
                media_type=MediaType.VIDEO,
                path=rel_video_path,
                timestamp=timestamp,
                duration=duration,
                size_bytes=file_size,
            )
            with self._session_factory() as db:
                media_service.create_media(db, video_media)
            print(f"✓ Video media record created in database")

        except subprocess.CalledProcessError as e:
            print(f"❌ FFmpeg failed: {e}")
            print(f"FFmpeg stderr: {e.stderr}")
            print(f"FFmpeg stdout: {e.stdout}")
        except Exception as e:
            print(f"❌ Error saving video clip: {e}")
            import traceback
            traceback.print_exc()
