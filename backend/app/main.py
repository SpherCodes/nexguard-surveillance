from alembic.config import Config
from alembic import command
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from pathlib import Path

from .dependencies import get_video_capture

from .core.database import Base, engine, sessionLocal, Camera
from .services.video_capture import CameraConfig, VideoCapture
from .api.router import api_router


video_capture = get_video_capture()

def setup_directories():
    """Create necessary directories for the application"""
    base_dir = Path("data")
    storage_dir = base_dir / "storage"
    database_dir = base_dir / "database"

    base_dir.mkdir(exist_ok=True)
    storage_dir.mkdir(exist_ok=True)
    database_dir.mkdir(exist_ok=True)

    (storage_dir / "images").mkdir(parents=True, exist_ok=True)
    (storage_dir / "videos").mkdir(parents=True, exist_ok=True)
    (storage_dir / "thumbnails").mkdir(parents=True, exist_ok=True)

    print("📁 Directory structure created successfully!")


def setup_database():
    """Initialize and migrate database if missing"""
    try:
        db_dir = Path("data/database")
        db_dir.mkdir(parents=True, exist_ok=True)
        db_path = db_dir / "nexguard.db"

        if not db_path.exists():
            print("📦 Database file not found. Applying migrations...")

            alembic_cfg = Config(str(Path(__file__).parent / "alembic.ini"))
            alembic_cfg.set_main_option("script_location", str(Path(__file__).parent / "alembic"))
            command.upgrade(alembic_cfg, "head")

            print("✅ Migrations applied")
        else:
            print("📦 Database file exists. No migrations applied.")
    except Exception as e:
        print(f"❌ Database setup error: {e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting NexGuard API...")

    setup_directories()
    setup_database()
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")

    try:
        db = sessionLocal()
        cameras = db.query(Camera).all()
        print(f"🎥 Starting {len(cameras)} camera(s)...")

        for camera in cameras:
            if camera.enabled:
                # ✅ Create CameraConfig instance
                config = CameraConfig(
                    camera_id=camera.camera_id,
                    url=camera.url,
                    fps_target=camera.fps_target,
                    resolution=(camera.resolution_width, camera.resolution_height),
                    enabled=camera.enabled,
                    location=camera.location
                )

                added = video_capture.add_camera(config)
                if added:
                    print(f"✅ Camera {camera.camera_id} configured")
                else:
                    print(f"⚠️ Camera {camera.camera_id} already exists")

        # Start all enabled cameras
        video_capture.start_all_cameras()
        print("🎬 All enabled cameras started")

    except Exception as e:
        print(f"❌ Failed to initialize cameras: {e}")
    finally:
        db.close()

    yield
    print("🛑 Shutting down NexGuard API...")
    video_capture.stop_all_cameras()


app = FastAPI(
    title="NexGuard API",
    description="Real-time object detection and surveillance system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route setup
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Welcome to the NexGuard API!"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
