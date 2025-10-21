"""
FastAPI dependencies with database integration
"""
from pathlib import Path
from typing import Generator, Annotated, Optional
from fastapi import Depends
from sqlalchemy.orm import Session

from .services.alert_service import AlertService

from .Settings import settings
from .utils import firebase_fcm_service



from .core.database.connection import get_db, SessionLocal
from .services.camera_service import camera_service
from .services.zone_service import zone_service
from .services.detection_service import detection_service
from .services.video_capture import VideoCapture
from .services.inference_engine import YOLOProcessor as InferenceEngine
from .utils.detection_manager import DetectionEventManager
from .services.sys_config_service import SysConfigService
from .schema.sysconfig import SysInferenceConfig

_video_capture: Optional[VideoCapture] = None
_inference_engine: Optional[InferenceEngine] = None
_detection_manager: Optional["DetectionEventManager"] = None
_firebase_fcm_service: Optional[firebase_fcm_service.Firebase_FCM_Service] = None
_alert_service: Optional[AlertService] = None

def get_video_capture() -> VideoCapture:
    """Get or create video capture singleton"""
    global _video_capture
    if _video_capture is None:
        _video_capture = VideoCapture()
    return _video_capture

def ensure_inference_engine(config: SysInferenceConfig | None = None, force_reload: bool = False) -> InferenceEngine:
    """Ensure the global inference engine is initialized and synced with configuration."""
    global _inference_engine

    if config is None:
        db_session = SessionLocal()
        try:
            config = get_sys_config_service().get_inference_config(db_session)
        finally:
            db_session.close()

    if not config.available_models:
        raise ValueError("No AI models are registered for inference")

    selected_model = next((m for m in config.available_models if m.name == config.model), None)
    if not selected_model:
        raise ValueError(f"Model '{config.model}' is not registered")

    model_path = Path(settings.get_absolute_model_path(selected_model.path))
    detection_manager = get_detection_event_manager()
    video_capture = get_video_capture()

    if _inference_engine is None or force_reload:
        _inference_engine = InferenceEngine(
            model_path=str(model_path),
            conf_threshold=config.min_detection_threshold,
            detection_manager=detection_manager,
        )
    else:
        if _inference_engine.model_path != model_path:
            _inference_engine.load_model(model_path, conf_threshold=config.min_detection_threshold)
        else:
            _inference_engine.set_conf_threshold(config.min_detection_threshold)

    if _inference_engine.video_capture is None and video_capture is not None:
        _inference_engine.connect_video_capture(video_capture)

    return _inference_engine


def get_inference_engine(force_reload: bool = False) -> InferenceEngine:
    """Get inference engine instance with detection manager."""
    return ensure_inference_engine(force_reload=force_reload)

def get_sys_config_service() -> SysConfigService:
    """Get system configuration service instance"""
    return SysConfigService()

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
        alert_service = get_alert_service()
        _detection_manager = DetectionEventManager(alert_service)
    return _detection_manager

def get_firebase_fcm_service():
    """Get Firebase FCM service instance"""
    global _firebase_fcm_service
    if _firebase_fcm_service is None:
        _firebase_fcm_service = firebase_fcm_service.Firebase_FCM_Service(settings.FIREBASE_SERVICE_ACCOUNT)
    return _firebase_fcm_service

def get_alert_service():
    """Get Alert service instance"""
    global _alert_service
    if _alert_service is None:
        _alert_service = AlertService(get_firebase_fcm_service())
    return _alert_service

#TODO: fix the use of Session
"""Manages persistence operations for ORM-mapped objects.

The _orm.Session is not safe for use in concurrent threads.. See session_faq_threadsafe for background.

The Session's usage paradigm is described at /orm/session."""
DatabaseDep = Annotated[Session, Depends(get_database_session)]
CameraServiceDep = Annotated[object, Depends(get_camera_service)]
ZoneServiceDep = Annotated[object, Depends(get_zone_service)]
DetectionServiceDep = Annotated[object, Depends(get_detection_service)]
VideoCaptureServiceDep = Annotated[VideoCapture, Depends(get_video_capture)]
InferenceEngineDep = Annotated[InferenceEngine, Depends(get_inference_engine)]