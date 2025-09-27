from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import sys
import os
from pathlib import Path

# Add the app directory to the Python path
app_dir = Path(__file__).parent.parent.parent  # Go up 3 levels to reach 'app'
sys.path.insert(0, str(app_dir))

try:
    from ...Settings import Settings
except ImportError:
    # Fallback for different import scenarios
    try:
        from app.Settings import Settings
    except ImportError:
        # Last resort - use environment variables directly
        class Settings:
            @property
            def DATABASE_URL(self):
                return os.getenv('DATABASE_URL', 'sqlite:///./data/database/nexguard.db')


settings = Settings()
DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)

def drop_tables():
    """Drop all tables"""
    Base.metadata.drop_all(bind=engine)
