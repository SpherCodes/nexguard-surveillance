from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CameraBase(BaseModel):
    """Base camera schema with common fields"""
    url: str = Field(..., description="Camera stream URL")
    name: Optional[str] = Field(None, description="Camera display name")
    zone_id: Optional[int] = Field(None, description="Zone ID this camera belongs to")
    location: Optional[str] = Field(None, description="Physical location of camera")
    fps_target: int = Field(15, ge=1, le=60, description="Target FPS for recording")
    resolution_width: int = Field(640, ge=320, le=4096, description="Video width in pixels")
    resolution_height: int = Field(480, ge=240, le=2160, description="Video height in pixels")
    enabled: bool = Field(True, description="Whether camera is active")

class CameraCreate(CameraBase):
    """Schema for creating a new camera"""
    pass

class CameraUpdate(BaseModel):
    """Schema for updating camera (all fields optional)"""
    url: Optional[str] = None
    name: Optional[str] = None
    zone_id: Optional[int] = None
    location: Optional[str] = None
    fps_target: Optional[int] = Field(None, ge=1, le=60)
    resolution_width: Optional[int] = Field(None, ge=320, le=4096)
    resolution_height: Optional[int] = Field(None, ge=240, le=2160)
    enabled: Optional[bool] = None


class Camera(CameraBase):
    """Complete camera schema with database fields"""
    id: int
    created_at: datetime
    enabled: bool 
    last_active: Optional[datetime] = None

    class Config:
        from_attributes = True


class CameraWithRelations(Camera):
    """Camera schema including related data"""
    zone: Optional['Zone'] = None
    
    class Config:
        from_attributes = True


# Forward reference for circular imports
from .zone import Zone
CameraWithRelations.model_rebuild()