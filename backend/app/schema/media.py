from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, validator
from enum import Enum

class MediaType(str, Enum):
    """Enum for media types"""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"


class MediaBase(BaseModel):
    """Base media schema"""
    camera_id: int = Field(..., description="ID of camera that captured media")
    detection_id: Optional[int] = Field(None, description="Detection ID if media is from detection")
    media_type: MediaType = Field(..., description="Type of media file")
    path: str = Field(..., description="File path to media")
    timestamp: float = Field(..., description="Unix timestamp when media was captured")
    duration: Optional[float] = Field(None, ge=0, description="Duration in seconds (for video/audio)")
    size_bytes: Optional[int] = Field(None, ge=0, description="File size in bytes")

    @field_validator('path')
    def validate_path(cls, v):
        """Validate file path"""
        if not v or not isinstance(v, str):
            raise ValueError('Path must be a non-empty string')
        return v.strip()

class MediaCreate(MediaBase):
    """Schema for creating new media"""
    pass


class MediaUpdate(BaseModel):
    """Schema for updating media"""
    detection_id: Optional[int] = None
    size_bytes: Optional[int] = Field(None, ge=0)


class Media(MediaBase):
    """Complete media schema with database fields"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MediaWithRelations(Media):
    """Media schema including related data"""
    camera: Optional['Camera'] = None
    detection: Optional['Detection'] = None

    class Config:
        from_attributes = True


# Forward references
from .camera import Camera
from .detection import Detection
MediaWithRelations.model_rebuild()