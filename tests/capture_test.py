import sys
import os

import numpy as np

import time

import cv2

from backend.app.services.inference_engine import YOLOProcessor
from backend.app.services.video_capture import CameraConfig, VideoCapture


def main():
    # Initialize VideoCapture (from your existing code)
    video_capture = VideoCapture()
    
    # Add cameras
    camera1 = CameraConfig(
        camera_id="cam1",
        url="0",  # Default webcam
        fps_target=15,
        resolution=(640, 480),
        buffer_size=10,
        enabled=True
    )
    
    camera2 = CameraConfig(
        camera_id="cam2",
        url="1",  # Replace with actual URL
        fps_target=15,
        resolution=(640, 480),
        buffer_size=10,
        enabled=True
    )
    camera3 = CameraConfig(
        camera_id="cam3",
        url="3",  # Replace with actual URL
        fps_target=15,
        resolution=(640, 480),
        buffer_size=10,
        enabled=True
    )
    
    video_capture.add_camera(camera1)
    video_capture.add_camera(camera2)
    # video_capture.add_camera(camera3)
    
    # Start cameras
    video_capture.start_all_cameras()
    
    # Initialize YOLO processor
    yolo_processor = YOLOProcessor(model_path="/model/yolo11s.pt")
    yolo_processor.connect_video_capture(video_capture)
    
    # Start processing on all cameras
    yolo_processor.start_processing()
    display_results(yolo_processor, video_capture)
    
    # Add this to your main execution loop after starting processing
def display_results(yolo_processor: YOLOProcessor, video_capture: VideoCapture):
    """Handle all OpenCV GUI operations in main thread"""
    try:
        while True:
            for camera_id in yolo_processor.display_windows:
                if not yolo_processor.display_windows[camera_id]:
                    continue
                    
                frame_data = yolo_processor.get_latest_results(camera_id)
                
                if frame_data and hasattr(frame_data, 'annotated_frame'):
                    cv2.imshow(f"{camera_id}", frame_data.annotated_frame)
                
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
    except KeyboardInterrupt:
        print("Display interrupted by user")
    finally:
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()