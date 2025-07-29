from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, validator


class ZoneBase(BaseModel):
    """Base zone schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Zone name")
    description: Optional[str] = Field(None, max_length=500, description="Zone description")

    @field_validator('name')
    def validate_name(cls, v):
        """Validate zone name"""
        if not v or not isinstance(v, str):
            raise ValueError('Zone name must be a non-empty string')
        return v.strip()


class ZoneCreate(ZoneBase):
    """Schema for creating a new zone"""
    pass


class ZoneUpdate(BaseModel):
    """Schema for updating zone"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator('name')
    def validate_name(cls, v):
        """Validate zone name if provided"""
        if v is not None:
            if not v or not isinstance(v, str):
                raise ValueError('Zone name must be a non-empty string')
            return v.strip()
        return v


class Zone(ZoneBase):
    """Complete zone schema with database fields"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ZoneWithCameras(Zone):
    """Zone schema including cameras"""
    cameras: List['Camera'] = []

    class Config:
        from_attributes = True


# Forward reference
from .camera import Camera
ZoneWithCameras.model_rebuild()