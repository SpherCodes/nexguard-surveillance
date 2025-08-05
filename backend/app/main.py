from alembic.config import Config
from alembic import command
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from pathlib import Path

from .core.database.connection import Base, engine, SessionLocal, create_tables
from .core.models import Camera
from .services.camera_service import camera_service
from .Settings import settings
from .data.seed import seed_default_settings, seed_default_zones
from .dependencies import get_video_capture , get_inference_engine
from .services.video_capture import CameraConfig, VideoCapture
from .api.router import api_router

video_capture = get_video_capture()
inference_engine = get_inference_engine()


def setup_database():
    """Initialize and migrate database if missing"""
    try:
        # Use settings from config
        settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
        db_path = settings.DATA_DIR / "nexguard.db"

        if not db_path.exists():
            print("📦 Database file not found. Applying migrations...")

            alembic_cfg = Config(str(Path(__file__).parent / "alembic.ini"))
            alembic_cfg.set_main_option("script_location", str(Path(__file__).parent / "alembic"))
            alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
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
    
    setup_database()
    create_tables()

    db = SessionLocal()
    try:
        seed_default_settings(db)
        seed_default_zones(db)
        print("✅ Database tables created successfully")

        # Get cameras using the service layer
        cameras = camera_service.get_active_cameras(db)
        print(f"🎥 Starting {len(cameras)} active camera(s)...")
        print(f"Infrence instance:{inference_engine}")

        for camera in cameras:
            # Create CameraConfig instance
            config = CameraConfig(
                camera_id=camera.id,
                url=camera.url,
                fps_target=camera.fps_target,
                resolution=(camera.resolution_width, camera.resolution_height),
                enabled=camera.enabled,
                location=camera.location
            )

            added = video_capture.add_camera(config)
            if added:
                print(f"✅ Camera {camera.id} configured")
                camera_service.update_last_active(db, camera.id)
            else:
                print(f"⚠️ Camera {camera.id} already exists")
        
        camera_ids = list(video_capture.cameras.keys())
        
        if camera_ids:
            print(f"Starting YOLO processing for cameras: {camera_ids}")
            inference_engine.start_processing(camera_ids , video_capture)

        # Start all enabled cameras
        video_capture.start_all_cameras()
        print("🎬 All enabled cameras started")

    except Exception as e:
        print(f"❌ Failed to initialize cameras: {e}")
        raise
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
    return {
        "status": "healthy",
        "database_url": settings.DATABASE_URL,
        "debug_mode": settings.DEBUG
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )