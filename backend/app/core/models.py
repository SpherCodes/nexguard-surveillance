from datetime import datetime, timezone
from sqlalchemy import JSON, Column, DateTime, Integer, String, Float, Boolean, ForeignKey, func, Text
from sqlalchemy.orm import relationship
from .database.connection import Base


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    # Relationships
    cameras = relationship("Camera", back_populates="zone", cascade="all, delete")


class Camera(Base):
    __tablename__ = "cameras"
    
    id = Column(Integer, primary_key=True, autoincrement=True, unique=True, index=True)
    url = Column(String(500), nullable=False)
    name = Column(String(100), nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True, index=True)
    location = Column(String(200), nullable=True)
    fps_target = Column(Integer, default=15)
    resolution_width = Column(Integer, default=640)
    resolution_height = Column(Integer, default=480)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    last_active = Column(DateTime, nullable=True)

    # Relationships
    zone = relationship("Zone", back_populates="cameras")
    detections = relationship("Detection", back_populates="camera")
    media = relationship("Media", back_populates="camera")


class Detection(Base):
    __tablename__ = "detections"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), index=True)
    timestamp = Column(Float, index=True)
    detection_type = Column(String(50), index=True)
    confidence = Column(Float)
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    camera = relationship("Camera", back_populates="detections")
    media = relationship("Media", back_populates="detection", cascade="all, delete")


class Media(Base):
    __tablename__ = "media"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), index=True)
    detection_id = Column(Integer, ForeignKey("detections.id"), nullable=True, index=True)
    media_type = Column(String(50), index=True)
    path = Column(String(1000), nullable=False)
    timestamp = Column(Float, index=True)
    duration = Column(Float, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    camera = relationship("Camera", back_populates="media")
    detection = relationship("Detection", back_populates="media")


class InferenceSettings(Base):
    __tablename__ = "inference_settings"

    id = Column(Integer, primary_key=True)
    min_detection_threshold = Column(Float, default=0.5)
    model = Column(String(100), default="yolo11n")
    model_path = Column(String(500), nullable=True, default="models/yolo11n.pt")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class StorageSettings(Base):
    __tablename__ = "storage_settings"

    id = Column(Integer, primary_key=True)
    storage_type = Column(String(50), default="local")
    retention_days = Column(Integer, default=30)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    firstname = Column(String(50), nullable=False)
    lastname = Column(String(50), nullable=False)
    middlename = Column(String(50), nullable=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    role = Column(String(20), default="operator")
    status = Column(String(20), default="pending")

class UserDeviceToken(Base):
    __tablename__ = "user_device_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_token = Column(String(255), nullable=False, unique=True)
    device_type = Column(String(50), nullable=False)
    device_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class NotificationLog(Base):
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, default=1)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False) 
    data = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    delivered = Column(Boolean, default=False)
    read = Column(Boolean, default=False)
    firebase_message_id = Column(String(255), nullable=True)

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(50), nullable=False)
    enabled = Column(Boolean, default=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship
    user = relationship("User", backref="preferences")