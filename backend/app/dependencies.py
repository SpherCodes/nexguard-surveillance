from functools import lru_cache

from .services.detection import DetectionEventManager
from .services.video_capture import VideoCapture
from .services.inference_engine import YOLOProcessor as InferenceEngine
from .config import settings

_video_capture_instance = None
_inference_engine_instance = None

def get_video_capture() -> VideoCapture:
    global _video_capture_instance
    if _video_capture_instance is None:
        _video_capture_instance = VideoCapture()
    return _video_capture_instance

def get_inference_engine() -> InferenceEngine:
    global _inference_engine_instance
    if _inference_engine_instance is None:
        # Get the detection event manager instance
        detection_manager = get_detection_event_manager()
        
        _inference_engine_instance = InferenceEngine(
            model_path=settings.DEFAULT_MODEL_PATH,
            conf_threshold=settings.CONFIDENCE_THRESHOLD,
            detection_manager=detection_manager
        )
        
        # Connect video capture
        video_capture = get_video_capture()
        _inference_engine_instance.connect_video_capture(video_capture)
    return _inference_engine_instance

@lru_cache()
def get_detection_event_manager() -> DetectionEventManager:
    """Single instance for all cameras"""
    return DetectionEventManager()