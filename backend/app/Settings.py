import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List, Tuple


class Settings(BaseSettings):
    """Application configuration settings"""

    # Database Configuration
    DATABASE_URL: str

    # Application Settings
    LOG_LEVEL: str

    # Directories
    DATA_DIR: Path = Path("./data")
    STORAGE_DIR: Path = DATA_DIR / "storage"
    DATABASE_DIR: Path = DATA_DIR / "database"

    STORAGE_IMG_DIR: Path = STORAGE_DIR / "images"
    STORAGE_VIDEO_DIR: Path = STORAGE_DIR / "videos"
    STORAGE_THUMBNAIL_DIR: Path = STORAGE_DIR / "thumbnails"

    MODELS_DIR: Path = DATA_DIR / "models"

    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "NexGuard"

    # Video Settings
    DEFAULT_FPS: int = 15
    DEFAULT_RESOLUTION: Tuple[int, int] = (640, 480)
    BUFFER_SIZE: int = 10

    class Config:
        env_file = ".env"

    def __init__(self, **values):
        super().__init__(**values)
        # Ensure directories exist
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.DATABASE_DIR.mkdir(parents=True, exist_ok=True)
        self.MODELS_DIR.mkdir(parents=True, exist_ok=True)
        self.STORAGE_IMG_DIR.mkdir(parents=True, exist_ok=True)
        self.STORAGE_VIDEO_DIR.mkdir(parents=True, exist_ok=True)
        self.STORAGE_THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
