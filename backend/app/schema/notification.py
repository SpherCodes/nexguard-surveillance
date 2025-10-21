from datetime import datetime
from typing import Any, Dict, Optional, List
from pydantic import BaseModel, Field


class DeviceTokenRegister(BaseModel):
    """Schema for registering a device token"""
    device_token: str = Field(..., description="Firebase device token")
    device_type: str = Field(..., description="Device type (web, android, ios)")
    device_name: Optional[str] = Field(None, description="Device name/description")


class DeviceTokenRequest(BaseModel):
    device_token: str
    device_type: str  # "ios", "android", "web"
    device_name: Optional[str] = None


class DeviceTokenResponse(BaseModel):
    """Response schema for device token"""
    id: int
    device_token: str
    device_type: str
    device_name: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationRequest(BaseModel):
    title: str
    body: str
    notification_type: str = "custom"
    data: Optional[Dict[str, Any]] = None
    priority: str = "normal"

class NotificationRequest(BaseModel):
    """Schema for notification requests"""
    user_id: Optional[int] = Field(None, description="User ID to send notification to")
    title: Optional[str] = Field(None, description="Notification title")
    body: Optional[str] = Field(None, description="Notification body")
    timestamp: Optional[float] = Field(None, description="Timestamp for the notification")

class NotificationPreferenceUpdate(BaseModel):
    """Schema for updating notification preferences"""
    user_id: int
    token: str
    category: str
    enabled: bool


class TopicSubscriptionRequest(BaseModel):
    """Schema for subscribing/unsubscribing a token to a topic"""
    device_token: str
    topic: str

class NotificationPreferenceResponse(BaseModel):
    """Schema for notification preference responses"""
    user_id: int
    category: List[str] 
