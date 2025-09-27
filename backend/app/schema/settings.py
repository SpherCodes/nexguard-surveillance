from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, validator
from enum import Enum


class StorageType(str, Enum):
    """Enum for storage types"""
    LOCAL = "local"


class InferenceSettingsBase(BaseModel):
    """Base inference settings schema"""
    min_detection_threshold: float = Field(0.5, ge=0.0, le=1.0, description="Minimum confidence threshold")
    model: str = Field("yolo11n", description="Model name")
    model_path: Optional[str] = Field("models/yolo11n.pt", description="Path to model file")

    @field_validator('model')
    def validate_model(cls, v):
        """Validate model name"""
        if not v or not isinstance(v, str):
            raise ValueError('Model name must be a non-empty string')
        return v.strip()


class InferenceSettingsCreate(InferenceSettingsBase):
    """Schema for creating inference settings"""
    pass


class InferenceSettingsUpdate(BaseModel):
    """Schema for updating inference settings"""
    min_detection_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    model: Optional[str] = None
    model_path: Optional[str] = None

    @field_validator('model')
    def validate_model(cls, v):
        """Validate model name if provided"""
        if v is not None:
            if not v or not isinstance(v, str):
                raise ValueError('Model name must be a non-empty string')
            return v.strip()
        return v


class InferenceSettings(InferenceSettingsBase):
    """Complete inference settings schema"""
    updated_at: datetime

    class Config:
        from_attributes = True


class StorageSettingsBase(BaseModel):
    """Base storage settings schema"""
    storage_type: StorageType = Field(StorageType.LOCAL, description="Storage backend type")
    retention_days: int = Field(30, ge=1, le=3650, description="Data retention period in days")


class StorageSettingsCreate(StorageSettingsBase):
    """Schema for creating storage settings"""
    pass


class StorageSettingsUpdate(BaseModel):
    """Schema for updating storage settings"""
    storage_type: Optional[StorageType] = None
    retention_days: Optional[int] = Field(None, ge=1, le=3650)


class StorageSettings(StorageSettingsBase):
    """Complete storage settings schema"""
    updated_at: datetime

    class Config:
        from_attributes = True