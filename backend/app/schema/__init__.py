from .camera import Camera, CameraCreate, CameraUpdate, CameraWithRelations
from .detection import Detection, DetectionCreate, DetectionUpdate, DetectionWithRelations, BoundingBox
from .zone import Zone, ZoneCreate, ZoneUpdate, ZoneWithCameras
from .media import Media, MediaCreate, MediaUpdate, MediaWithRelations, MediaType
from .settings import (
    InferenceSettings, InferenceSettingsCreate, InferenceSettingsUpdate,
    StorageSettings, StorageSettingsCreate, StorageSettingsUpdate, StorageType
)

__all__ = [
    # Camera schemas
    "Camera", "CameraCreate", "CameraUpdate", "CameraWithRelations",
    
    # Detection schemas
    "Detection", "DetectionCreate", "DetectionUpdate", "DetectionWithRelations", "BoundingBox",
    
    # Zone schemas
    "Zone", "ZoneCreate", "ZoneUpdate", "ZoneWithCameras",
    
    # Media schemas
    "Media", "MediaCreate", "MediaUpdate", "MediaWithRelations", "MediaType",
    
    # Settings schemas
    "InferenceSettings", "InferenceSettingsCreate", "InferenceSettingsUpdate",
    "StorageSettings", "StorageSettingsCreate", "StorageSettingsUpdate", "StorageType",
]