import asyncio
import threading
import cv2
import numpy as np
import time
from ultralytics import YOLO
import queue

from .detection import DetectionEventManager

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
        self.model = YOLO(model_path)
        self.conf_threshold = conf_threshold
        self.video_capture = None
        self.processing_threads = {}
        self.stop_flags = {}
        self.results_buffer = {}
        self.display_buffers = {}
        self.processing_stats = {}
        
        self.detection_manager = detection_manager

    def connect_video_capture(self, video_capture):
        """Connect to an existing VideoCapture instance."""
        self.video_capture = video_capture
        
        if self.detection_manager:
            self.detection_manager.video_capture = video_capture
            self.detection_manager.inference_engine = self
    
    def start_processing(self,camera_ids=None):
        """
        Start processing threads for specified cameras or all enabled cameras.
        
        Args:
            camera_ids (List[str], optional): Camera IDs to process. If None, process all enabled cameras.
        """
        if camera_ids is None:
            camera_ids = [
                camera_id for camera_id, config in self.video_capture.cameras.items()
                if config.enabled
            ]

        for camera_id in camera_ids:
            if camera_id not in self.video_capture.cameras:
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
            camera_ids = self.processing_thread.keys()
        
        # Set stop flags
        for camera_id in camera_ids:
            if camera_id in self.processing_threads and self.processing_threads[camera_id].is_alive():
                self.stop_flags[camera_id] = True
        
        for camera_id in camera_ids:
            if camera_id in self.processing_threads and self.processing_threads[camera_id].is_alive():
                self.processing_threads[camera_id].join(timeout=3.0)
                del self.processing_threads[camera_id]
                print(f"Stopped YOLO processing for camera {camera_id}")
        
    def _process_camera_stream(self, camera_id: str):
        """
        Thread function to process frames from a camera with YOLO.
        
        Args:
            camera_id (str): The camera ID to process.
        """
        print(f"starting processing for Camera: {camera_id}")
        last_frame_number = -1
        processing_start_time = time.time()
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
            
            # Process frame with YOLO
            inference_start = time.time()
            results = self.model(frame_data.frame, conf=self.conf_threshold, verbose=False)
            inference_time = time.time() - inference_start
              # Clear previous detections
            frame_data.detections = []
            human_detected = False
            
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
                        self.detection_manager.record_detection(camera_id, frame_data, detection)
                    
                    # Track human detection for UI
                    if detection['name'].lower() == 'person':
                        human_detected = True
                        print(f"Human detected in camera {camera_id}")
            
            # Create annotated frame
            annotated_frame = frame_data.frame.copy()
            
            # Draw detections
            # for detection in frame_data.detections:
            #     box = detection['box']
            #     cls_name = detection['name']
            #     conf = detection['conf']
                
            #     text = f"{cls_name} {conf:.2f}"
            #     (text_width, text_height), _ = cv2.getTextSize(
            #         text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2
            #     )
                
            #     # Draw box and label
            #     cv2.rectangle(annotated_frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 2)
            #     cv2.rectangle(
            #         annotated_frame,
            #         (box[0], box[1] - text_height - 10),
            #         (box[0] + text_width, box[1]),
            #         (0, 255, 0),
            #         -1
            #     )
            #     cv2.putText(annotated_frame, text, (box[0], box[1] - 5),
            #                 cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
            
            # Add stats overlay
            # fps = frames_processed / (time.time() - processing_start_time)
            
            # status_text = f"FPS: {fps:.1f} | Inference: {inference_time*1000:.1f}ms"
            # if human_detected:
            #     status_text += " | 🚨 HUMAN DETECTED"
                
            # cv2.putText(
            #     annotated_frame,
            #     status_text,
            #     (10, 30),
            #     cv2.FONT_HERSHEY_SIMPLEX,
            #     0.7,
            #     (0, 0, 255) if human_detected else (0, 255, 0),
            #     2
            # )
            
            # cv2.putText(
            #     annotated_frame,
            #     f"Camera: {camera_id}",
            #     (10, 60),
            #     cv2.FONT_HERSHEY_SIMPLEX,
            #     0.6,
            #     (255, 255, 255),
            #     2
            # )
            
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