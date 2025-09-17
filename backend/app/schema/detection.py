from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator

class DetectionBase(BaseModel):
    """Base detection schema"""
    camera_id: int = Field(..., description="ID of camera that made detection")
    timestamp: float = Field(..., description="Unix timestamp of detection")
    detection_type: str = Field(..., description="Type of object detected")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")
    notified: bool = Field(False, description="Whether notification was sent")

    @field_validator('detection_type')
    def validate_detection_type(cls, v):
        """Validate detection type"""
        if not v or not isinstance(v, str):
            raise ValueError('Detection type must be a non-empty string')
        return v.strip().lower()


class DetectionCreate(DetectionBase):
    """Schema for creating a new detection"""
    pass


class DetectionUpdate(BaseModel):
    """Schema for updating detection"""
    notified: Optional[bool] = None


class Detection(DetectionBase):
    """Complete detection schema with database fields"""
    id: int
    created_at: datetime
    image_media: Optional[List['Media']] = Field([], description="Associated image media")
    video_media: Optional[List['Media']] = Field([], description="Associated video media")

    class Config:
        from_attributes = True


class DetectionWithRelations(Detection):
    """Detection schema including related data"""
    camera: Optional['Camera'] = None
    media: Optional[List['Media']] = []

    class Config:
        from_attributes = True


# Forward references
from .camera import Camera
from .media import Media
DetectionWithRelations.model_rebuild()