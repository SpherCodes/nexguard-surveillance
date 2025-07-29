import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.models import Base, engine, Camera, Detection, Media, SystemConfig

def init_db():
    """Initialize the database with tables and default data"""
    # Make sure database directory exists
    db_dir = Path("data/database")
    db_dir.mkdir(parents=True, exist_ok=True)
    
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Database setup complete!")

if __name__ == "__main__":
    init_db()