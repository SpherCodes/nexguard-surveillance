from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator


class BoundingBox(BaseModel):
    """Schema for bounding box coordinates"""
    x: float = Field(..., ge=0, description="X coordinate")
    y: float = Field(..., ge=0, description="Y coordinate")
    width: float = Field(..., gt=0, description="Bounding box width")
    height: float = Field(..., gt=0, description="Bounding box height")


class DetectionBase(BaseModel):
    """Base detection schema"""
    camera_id: int = Field(..., description="ID of camera that made detection")
    timestamp: float = Field(..., description="Unix timestamp of detection")
    detection_type: str = Field(..., description="Type of object detected")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")
    bounding_box: Dict[str, Any] = Field(..., description="Bounding box coordinates")
    notified: bool = Field(False, description="Whether notification was sent")

    @validator('detection_type')
    def validate_detection_type(cls, v):
        """Validate detection type"""
        if not v or not isinstance(v, str):
            raise ValueError('Detection type must be a non-empty string')
        return v.strip().lower()

    @validator('bounding_box')
    def validate_bounding_box(cls, v):
        """Validate bounding box structure"""
        try:
            # Try to create BoundingBox from dict to validate
            BoundingBox(**v)
            return v
        except Exception as e:
            raise ValueError(f'Invalid bounding box format: {e}')


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