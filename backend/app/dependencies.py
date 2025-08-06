"""
FastAPI dependencies with database integration
"""
from functools import lru_cache
from typing import Generator, Annotated, Optional
from webbrowser import get
from fastapi import Depends
from sqlalchemy.orm import Session

from .utils.detection_manager import DetectionEventManager

from .utils import detection_manager



from .core.database.connection import get_db
from .services.camera_service import camera_service
from .services.zone_service import zone_service
from .services.detection_service import detection_service
from .services.video_capture import VideoCapture
from .services.inference_engine import YOLOProcessor as InferenceEngine

_video_capture: Optional[VideoCapture] = None
_inference_engine: Optional[InferenceEngine] = None
_detection_manager: Optional[DetectionEventManager] = None

def get_video_capture() -> VideoCapture:
    """Get or create video capture singleton"""
    global _video_capture
    if _video_capture is None:
        _video_capture = VideoCapture()
    return _video_capture

def get_inference_engine() -> InferenceEngine:
    """Get inference engine instance with detection manager"""
    global _inference_engine
    if _inference_engine is None:
        detection_manager = get_detection_event_manager()
        _inference_engine = InferenceEngine(detection_manager=detection_manager)
    return _inference_engine

def get_database_session() -> Generator[Session, None, None]:
    """Get database session for FastAPI dependency injection"""
    yield from get_db()

def get_camera_service():
    """Get camera service instance"""
    return camera_service

def get_zone_service():
    """Get zone service instance"""
    return zone_service

def get_detection_service():
    """Get detection service instance"""
    return detection_service

def get_detection_event_manager():
    """Get detection event manager instance"""
    global _detection_manager
    if _detection_manager is None:
        _detection_manager = DetectionEventManager()
    return _detection_manager

#TODO: fix the use of Session 
"""Manages persistence operations for ORM-mapped objects.

The _orm.Session is not safe for use in concurrent threads.. See session_faq_threadsafe for background.

The Session's usage paradigm is described at /orm/session."""
DatabaseDep = Annotated[Session, Depends(get_database_session)]
CameraServiceDep = Annotated[object, Depends(get_camera_service)]
ZoneServiceDep = Annotated[object, Depends(get_zone_service)]
DetectionServiceDep = Annotated[object, Depends(get_detection_service)]
VideoCaptureServiceDep = Annotated[VideoCapture, Depends(get_video_capture)]