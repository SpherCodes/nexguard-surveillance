from datetime import datetime
from sqlalchemy import JSON, Column, DateTime, Integer, String, Float, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from .database.connection import Base


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    # Relationships
    cameras = relationship("Camera", back_populates="zone", cascade="all, delete")


class Camera(Base):
    __tablename__ = "cameras"
    
    id = Column(Integer, primary_key=True, autoincrement=True, unique=True, index=True)
    url = Column(String, nullable=False)
    name = Column(String, nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True, index=True)
    location = Column(String, nullable=True)
    fps_target = Column(Integer, default=15)
    resolution_width = Column(Integer, default=640)
    resolution_height = Column(Integer, default=480)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    last_active = Column(DateTime, nullable=True)

    # Relationships
    zone = relationship("Zone", back_populates="cameras")
    detections = relationship("Detection", back_populates="camera", cascade="all, delete")
    media = relationship("Media", back_populates="camera", cascade="all, delete")


class Detection(Base):
    __tablename__ = "detections"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), index=True)
    timestamp = Column(Float, index=True)
    detection_type = Column(String, index=True)
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
    media_type = Column(String, index=True)
    path = Column(String, nullable=False)
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
    model = Column(String, default="yolo11n")
    model_path = Column(String, nullable=True, default="models/yolo11n.pt")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class StorageSettings(Base):
    __tablename__ = "storage_settings"

    id = Column(Integer, primary_key=True)
    storage_type = Column(String, default="local")
    retention_days = Column(Integer, default=30)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)