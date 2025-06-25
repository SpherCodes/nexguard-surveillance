import os
from pathlib import Path
import sys

# Add project root to path to allow imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings  # Import settings if available

def create_storage_structure():
    """Create all necessary directories for storage"""
    # Define base directories
    base_dir = Path("data")
    storage_dir = base_dir / "storage"
    database_dir = base_dir / "database"
    
    # Create main directories
    base_dir.mkdir(exist_ok=True)
    storage_dir.mkdir(exist_ok=True)
    database_dir.mkdir(exist_ok=True)
    
    # Create storage structure
    image_dirs = [
        storage_dir / "images" / "raw",
        storage_dir / "images" / "annotated"
    ]
    
    video_dirs = [
        storage_dir / "videos" / "clips",
        storage_dir / "videos" / "archive"
    ]
    
    thumb_dir = storage_dir / "thumbnails"
    
    # Create all directories
    for directory in [*image_dirs, *video_dirs, thumb_dir]:
        directory.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {directory}")
    
    print("Storage structure initialized successfully!")
    return True

if __name__ == "__main__":
    create_storage_structure()