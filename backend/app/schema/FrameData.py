import numpy as np
from typing import Tuple


class FrameData:
    """Container for a processed frame and its metadata."""
    
    def __init__(self, frame: np.ndarray, camera_id: str, timestamp: float, 
        frame_number: int, resolution: Tuple[int, int]):
        self.frame = frame
        self.camera_id = camera_id
        self.timestamp = timestamp
        self.frame_number = frame_number
        self.resolution = resolution
        self.detections = []
        self.processed = False