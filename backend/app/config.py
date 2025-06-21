from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "NexGuard"
    
    # CORS Settings
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Model Settings
    DEFAULT_MODEL_PATH: str = "../../models/yolo11s.pt"
    CONFIDENCE_THRESHOLD: float = 0.5
    
    # Video Settings
    DEFAULT_FPS: int = 15
    DEFAULT_RESOLUTION: tuple = (640, 480)
    BUFFER_SIZE: int = 10
    
    # File Upload Settings
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_VIDEO_FORMATS: List[str] = [".mp4", ".avi", ".mov", ".mkv"]
    
    class Config:
        env_file = ".env"

settings = Settings()