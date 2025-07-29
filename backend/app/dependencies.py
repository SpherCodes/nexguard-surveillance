"""
FastAPI dependencies with database integration
"""
from functools import lru_cache
from typing import Generator, Annotated
from webbrowser import get
from fastapi import Depends
from sqlalchemy.orm import Session



from .core.database.connection import get_db, SessionLocal
from .services.camera_service import camera_service
from .services.zone_service import zone_service
from .services.detection_service import detection_service
from .services.video_capture import VideoCapture
from .services.inference_engine import YOLOProcessor as InferenceEngine
from .services.detection import DetectionEventManager 

_video_capture = None
_inference_engine = None

# TODO: Remove get_database_session from dependencies.py and use the one defined in connection.py

def get_video_capture() -> VideoCapture:
    """Get or create video capture singleton"""
    global _video_capture
    if _video_capture is None:
        _video_capture = VideoCapture()
    return _video_capture

def get_inference_engine() -> InferenceEngine:
    """Get or create inference engine singleton"""
    global _inference_engine
    if _inference_engine is None:
        _inference_engine = InferenceEngine()
    return _inference_engine

def get_database_session() -> Generator[Session, None, None]:
    """Get database session for FastAPI dependency injection"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_camera_service():
    """Get camera service instance"""
    return camera_service

def get_zone_service():
    """Get zone service instance"""
    return zone_service

def get_detection_service():
    """Get detection service instance"""
    return detection_service

@lru_cache()
def get_detection_event_manager() -> DetectionEventManager:
    """Single instance for all cameras"""
    return DetectionEventManager()

DatabaseDep = Annotated[Session, Depends(get_database_session)]
CameraServiceDep = Annotated[object, Depends(get_camera_service)]
ZoneServiceDep = Annotated[object, Depends(get_zone_service)]
DetectionServiceDep = Annotated[object, Depends(get_detection_service)]
VideoCaptureServiceDep = Annotated[VideoCapture, Depends(get_video_capture)]