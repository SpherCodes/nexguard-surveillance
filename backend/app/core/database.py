from datetime import datetime
from sqlalchemy import JSON, Column, DateTime, Integer, String, Float, Boolean, ForeignKey, create_engine
from sqlalchemy.orm import relationship, sessionmaker, declarative_base
import os
from pathlib import Path

data_dir = Path("./data")
data_dir.mkdir(exist_ok=True)

DatabaseURL = os.getenv("DATABASE_URL")

engine = create_engine(
    DatabaseURL,
    connect_args={"check_same_thread": False} if "sqlite" in DatabaseURL else {}
)
sessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Camera(Base):
    __tablename__ = "cameras"
    """Represents a camera in the system"""
    camera_id = Column(String, primary_key=True , unique=True, index=True)
    url = Column(String)
    name = Column(String, nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True, index=True)
    zone = relationship("Zone", back_populates="cameras")
    location = Column(String, nullable=True)
    fps_target = Column(Integer, default=15)
    resolution_width = Column(Integer, default=640)
    resolution_height = Column(Integer, default=480)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    last_active = Column(DateTime, nullable=True)
    
    # Relationships
    detections = relationship("Detection", back_populates="camera")
    media = relationship("Media", back_populates="camera")

class Detection(Base):
    __tablename__ = "detections"
    """Represents a detection event from a camera"""
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, ForeignKey("cameras.camera_id"), index=True)
    timestamp = Column(Float, index=True)
    detection_type = Column(String, index=True)
    confidence = Column(Float)
    bounding_box = Column(JSON)
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    camera = relationship("Camera", back_populates="detections")
    media = relationship("Media", back_populates="detection")
    
class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    # Relationships
    cameras = relationship("Camera", back_populates="zone", cascade="all, delete")


class Media(Base):
    __tablename__ = "media"
    
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String, ForeignKey("cameras.camera_id"), index=True)
    detection_id = Column(Integer, ForeignKey("detections.id"), nullable=True, index=True)
    media_type = Column(String, index=True)
    path = Column(String)
    timestamp = Column(Float, index=True)
    duration = Column(Float, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    camera = relationship("Camera", back_populates="media")
    detection = relationship("Detection", back_populates="media")

class SystemConfig(Base):
    __tablename__ = "system_config"
    
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    value_type = Column(String)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)