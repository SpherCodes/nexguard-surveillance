import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Tuple

class Settings(BaseSettings):
    """Application configuration settings"""

    # Project roots - calculate from backend/app/Settings.py location
    BACKEND_ROOT: Path = Path(__file__).resolve().parent.parent  # Points to backend/
    PROJECT_ROOT: Path = BACKEND_ROOT.parent  # Points to project root

    # Database Configuration
    DATABASE_URL: str = os.getenv('DATABASE_URL') or f"sqlite:///{BACKEND_ROOT / 'app' / 'data' / 'database' / 'nexguard.db'}"

    # Firebase Configuration
    FIREBASE_SERVICE_ACCOUNT: Path = BACKEND_ROOT / "app" / "service_key.json"

    # Application Settings
    LOG_LEVEL: str = "INFO"

    # Storage & Data Directories
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
    DETECTION_COOLDOWN: int = 30
    ENABLE_ALERT_NOTIFICATIONS: bool = True
    ALERT_NOTIFICATION_TIMEOUT: int = 10
    
    # WebRTC Configuration
    ICE_SERVERS: str = "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"
    
    # Authentication and Security
    SECRET_KEY: str = "your_secret_key_here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Debug Settings
    DEBUG: bool = False

    class Config:
        env_file = "../.env" 
        frozen = True

    def __init__(self, **values):
        super().__init__(**values)
        for path in [self.DATA_DIR, self.MODELS_DIR, self.STORAGE_DIR, self.STORAGE_IMG_DIR, self.STORAGE_VIDEO_DIR]:
            path.mkdir(parents=True, exist_ok=True)
    
    def get_absolute_path(self, relative_path: str) -> Path:
        """Convert a relative path to absolute based on storage directory"""
        if Path(relative_path).is_absolute():
            return Path(relative_path)
        return self.STORAGE_DIR / relative_path
    
    def get_relative_path(self, absolute_path: str | Path) -> str:
        """Convert an absolute path to relative based on storage directory"""
        abs_path = Path(absolute_path)
        try:
            # Try to make it relative to STORAGE_DIR
            relative = abs_path.relative_to(self.STORAGE_DIR)
            return str(relative)
        except ValueError:
            # If it's not under STORAGE_DIR, return as-is
            return str(abs_path)
    
    def get_absolute_model_path(self, relative_path: str) -> Path:
        """Convert a relative model path to absolute based on models directory"""
        if Path(relative_path).is_absolute():
            return Path(relative_path)
        return self.MODELS_DIR / relative_path
    
    def get_relative_model_path(self, absolute_path: str | Path) -> str:
        """Convert an absolute model path to relative based on models directory"""
        abs_path = Path(absolute_path)
        try:
            # Try to make it relative to MODELS_DIR
            relative = abs_path.relative_to(self.MODELS_DIR)
            return str(relative)
        except ValueError:
            # Try relative to PROJECT_ROOT for backwards compatibility
            try:
                relative = abs_path.relative_to(self.PROJECT_ROOT)
                return str(relative)
            except ValueError:
                # If it's not under MODELS_DIR or PROJECT_ROOT, return as-is
                return str(abs_path)

settings = Settings()
