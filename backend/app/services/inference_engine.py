import asyncio
import threading
import numpy as np
import time
from pathlib import Path
from typing import Optional
from ultralytics import YOLO
import queue

from .video_capture import VideoCapture


from ..utils.detection_manager import DetectionEventManager

class YOLOProcessor:
    """Processes multiple camera streams using YOLOv11 for object detection."""
    
    def __init__(self, model_path="yolo11n.pt", conf_threshold=0.5, detection_manager: DetectionEventManager = None):
        """
        Initialize the YOLO processor.
        
        Args:
            model_path (str): Path to the YOLO model weights.
            conf_threshold (float): Confidence threshold for detections.
            detection_manager: Injected DetectionEventManager instance
        """
        self.model: Optional[YOLO] = None
        self.model_path: Optional[Path] = None
        self.conf_threshold = conf_threshold
        self.processing_threads = {}
        self.video_capture = None
        self.stop_flags = {}
        self.results_buffer = {}
        self.display_buffers = {}
        self.processing_stats = {}
        self._model_lock = threading.Lock()
        
        self.detection_manager = detection_manager

        if model_path:
            self.load_model(model_path, conf_threshold=conf_threshold)

    def load_model(self, model_path: str | Path, conf_threshold: Optional[float] = None) -> None:
        """Load or swap the YOLO model used for inference."""
        resolved_path = Path(model_path)
        if not resolved_path.exists():
            raise FileNotFoundError(f"Model file not found: {resolved_path}")

        with self._model_lock:
            print(f"🧠 Loading YOLO model from {resolved_path}")
            self.model = YOLO(str(resolved_path))
            self.model_path = resolved_path
            if conf_threshold is not None:
                self.conf_threshold = conf_threshold

    def set_conf_threshold(self, conf_threshold: float) -> None:
        """Update the detection confidence threshold."""
        self.conf_threshold = conf_threshold

    def connect_video_capture(self, video_capture):
        """Connect to an existing VideoCapture instance."""
        self.video_capture = video_capture
        
        if self.detection_manager:
            self.detection_manager.video_capture = video_capture
            self.detection_manager.inference_engine = self
    
    def start_processing(self, camera_ids, video_capture: VideoCapture = None):
        print(f"Starting YOLO processing for cameras: {camera_ids}")
        print(f"VideoCapture instance: {video_capture}")
        """
        Start processing threads for specified cameras or all enabled cameras.
        
        Args:
            camera_ids (List[str], optional): Camera IDs to process. If None, process all enabled cameras.
            video_capture: VideoCapture instance to use (optional, uses self.video_capture if None)
        """
        vc = video_capture if video_capture is not None else self.video_capture
        
        if vc is None:
            print("❌ Error: No video_capture instance available.")
            raise RuntimeError("No video_capture instance available. Either pass it as parameter or call connect_video_capture() first.")
        
        self.video_capture = vc

        if self.model is None:
            raise RuntimeError("Inference engine has no model loaded. Call load_model() first.")
        
        if camera_ids is None:
            camera_ids = [
                camera_id for camera_id, config in vc.cameras.items()
                if config.enabled
            ]

        for camera_id in camera_ids:
            if camera_id not in vc.cameras:
                print(f"Camera {camera_id} not found.")
                continue
            
            if camera_id in self.processing_threads and self.processing_threads[camera_id].is_alive():
                print(f"Processing for camera {camera_id} is already running.")
                continue
            
            self.results_buffer[camera_id] = queue.Queue(maxsize=5)
            self.stop_flags[camera_id] = False
            self.processing_stats[camera_id] = {
                "processed_frames": 0,
                "last_processing_time": 0,
                "fps": 0,
                "last_inference_time": 0
            }
            
            thread = threading.Thread(
                target=self._process_camera_stream,
                args=(camera_id,),
                daemon=True
            )
            self.processing_threads[camera_id] = thread
            thread.start()
            print(f"Started YOLO processing for camera {camera_id}")

    def stop_processing(self, camera_ids=None):
        """
        Stop processing threads for specified cameras or all cameras.
        
        Args:
            camera_ids (List[str], optional): Camera IDs to stop. If None, stop all.
        """
        # Get all processing threads if none specified
        if camera_ids is None:
            camera_ids = list(self.processing_threads.keys())

        # Set stop flags
        for camera_id in camera_ids:
            if camera_id in self.stop_flags:
                self.stop_flags[camera_id] = True

        for camera_id in camera_ids:
            thread = self.processing_threads.get(camera_id)
            if thread and thread.is_alive():
                thread.join(timeout=3.0)
                print(f"Stopped YOLO processing for camera {camera_id}")
            self.processing_threads.pop(camera_id, None)
            self.results_buffer.pop(camera_id, None)
            self.processing_stats.pop(camera_id, None)
            self.stop_flags.pop(camera_id, None)
        
    def _process_camera_stream(self, camera_id: str):
        """
        Thread function to process frames from a camera with YOLO.
        
        Args:
            camera_id (str): The camera ID to process.
        """
        last_frame_number = -1
        frames_processed = 0
        
        while not self.stop_flags.get(camera_id, True):
            frame_data = self.video_capture.get_latest_frame(camera_id)
            
            if frame_data is None:
                time.sleep(0.01)
                continue
                
            if frame_data.frame_number == last_frame_number:
                time.sleep(0.01)
                continue
                
            last_frame_number = frame_data.frame_number
            
            if self.model is None:
                raise RuntimeError("Inference engine model was unloaded during processing")

            # Process frame with YOLO
            results = self.model(frame_data.frame, conf=self.conf_threshold, verbose=False)
            # Clear previous detections
            frame_data.detections = []
            
            for result in results:
                boxes = result.boxes.cpu().numpy()
                for i, box in enumerate(boxes):
                    detection = {
                        'box': box.xyxy[0].astype(int),
                        'conf': float(box.conf[0]),
                        'cls': int(box.cls[0]),
                        'name': result.names[int(box.cls[0])]
                    }
                    frame_data.detections.append(detection)
                    # Record detection synchronously
                    if self.detection_manager:
                        self.detection_manager.record_detection(camera_id, frame_data, detection , self)
                    
                    # Track human detection for UI
                    # if detection['name'].lower() == 'person':
                    #     print(f"Human detected in camera {camera_id}")
            # Create annotated frame
            annotated_frame = frame_data.frame.copy()
            
            # Store the annotated frame
            frame_data.annotated_frame = annotated_frame
            frame_data.processed = True
            
            # Update buffer
            try:
                if self.results_buffer[camera_id].full():
                    self.results_buffer[camera_id].get_nowait()
                self.results_buffer[camera_id].put(frame_data, block=False)
            except (queue.Full, queue.Empty):
                pass
            
            frames_processed += 1
        
        print(f"YOLO processing thread for camera {camera_id} has ended")
        
    def get_latest_results(self, camera_id: str):
        """
        Get the most recent processed frame results for a camera.
        
        Args:
            camera_id (str): The camera ID to get results for.
            
        Returns:
            Optional[FrameData]: The most recent frame data with detections or None.
        """
        if camera_id not in self.results_buffer:
            return None
        
        buffer = self.results_buffer[camera_id]
        if buffer.empty():
            return None
        
        # Get the latest result (similar approach as in VideoCapture)
        results = []
        try:
            while not buffer.empty():
                results.append(buffer.get_nowait())
        except queue.Empty:
            pass
        
        # Put all but the newest result back
        for result in results[:-1]:
            try:
                buffer.put(result, block=False)
            except queue.Full:
                pass
        
        return results[-1] if results else None