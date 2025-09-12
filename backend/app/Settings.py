import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List, Tuple

import os
#TODO:Fix importing of environmental variables from .env file

class Settings(BaseSettings):
    """Application configuration settings"""

    # Database Configuration - will be overridden by env vars
    DATABASE_URL: str = os.getenv('DATABASE_URL') or "sqlite:///./data/database/nexguard.db"

    # Firebase Configuration (service account key file located in this directory)
    FIREBASE_SERVICE_ACCOUNT: Path = Path("./service_key.json")

    # Application Settings
    LOG_LEVEL: str = "INFO"

    # Directories - configurable via environment
    # Directories - computed relative to backend root for consistency
    BACKEND_ROOT: Path = Path(__file__).resolve().parent.parent  # .../backend
    DATA_DIR: Path = BACKEND_ROOT / "data"
    STORAGE_DIR: Path = BACKEND_ROOT / "storage"

    STORAGE_IMG_DIR: Path = STORAGE_DIR / "images"
    STORAGE_VIDEO_DIR: Path = STORAGE_DIR / "videos"

    MODELS_DIR: Path = DATA_DIR / "models"

    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "NexGuard"

    # Video Settings
    DEFAULT_FPS: int = 15
    DEFAULT_RESOLUTION: Tuple[int, int] = (640, 480)
    BUFFER_SIZE: int = 10

    # Detection and Alert Settings
    MIN_CONFIDENCE: float = 0.5
    DETECTION_COOLDOWN: int = 30  # seconds between alerts for same detection type
    ENABLE_ALERT_NOTIFICATIONS: bool = True
    ALERT_NOTIFICATION_TIMEOUT: int = 10  # seconds
    
    # WebRTC Configuration
    ICE_SERVERS: str = "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"
    
    # Authentication and Security
    SECRET_KEY: str = "your_secret_key_here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Debug Settings
    DEBUG: bool = False

    class Config:
        env_file = "../.env"  # Points to backend/.env

    def __init__(self, **values):
        super().__init__(**values)
        # Ensure directories exist
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.STORAGE_IMG_DIR.mkdir(parents=True, exist_ok=True)
        self.STORAGE_VIDEO_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
