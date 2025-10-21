from pathlib import Path
from typing import Dict
import shutil
import urllib.request
from urllib.error import URLError, HTTPError

from sqlalchemy.orm import Session

from ..schema.user import UserStatus

from ..core.models import AIModels, Zone
from ..core.models import InferenceSettings, StorageSettings
from ..core.models import User
from ..services.auth_service import auth_service
from ..Settings import settings


YOLO_MODEL_REGISTRY: Dict[str, Dict[str, str]] = {
    "yolo11n": {
        "url": "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolo11n.pt",
        "description": "YOLOv11 Nano object detection model",
    },
    "yolo11s": {
        "url": "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolo11s.pt",
        "description": "YOLOv11 Small object detection model",
    },
    "yolo11m": {
        "url": "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolo11m.pt",
        "description": "YOLOv11 Medium object detection model",
    },
    "yolo11l": {
        "url": "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolo11l.pt",
        "description": "YOLOv11 Large object detection model",
    },
    "yolo11x": {
        "url": "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolo11x.pt",
        "description": "YOLOv11 Extra Large object detection model",
    },
}

DEFAULT_YOLO_MODEL = "yolo11n"


def _download_model(url: str, destination: Path) -> Path:
    """Download a model file to the destination path."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_path = destination.with_suffix(destination.suffix + ".tmp")

    try:
        with urllib.request.urlopen(url) as response, open(temp_path, "wb") as tmp_file:
            shutil.copyfileobj(response, tmp_file)
        temp_path.replace(destination)
        return destination
    except (HTTPError, URLError) as exc:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)
        raise RuntimeError(f"Failed to download model from {url}: {exc}") from exc


def _ensure_model_asset(model_name: str, model_meta: Dict[str, str]) -> Path:
    """Ensure the requested model exists locally, downloading it if needed."""
    filename = f"{model_name}.pt"
    destination = settings.MODELS_DIR / filename

    if destination.exists() and destination.stat().st_size > 0:
        return destination

    print(f"⬇️  Downloading {model_name} to {destination}")
    return _download_model(model_meta["url"], destination)


def _prepare_yolo_models(session: Session) -> Dict[str, AIModels]:
    """Download YOLO models and upsert them into the AIModels table."""
    prepared_models: Dict[str, AIModels] = {}

    for model_name, metadata in YOLO_MODEL_REGISTRY.items():
        local_path = _ensure_model_asset(model_name, metadata)
        relative_path = settings.get_relative_model_path(local_path)

        ai_model = session.query(AIModels).filter_by(name=model_name).first()
        if not ai_model:
            ai_model = AIModels(
                name=model_name,
                description=metadata.get("description"),
                path=relative_path,
            )
            session.add(ai_model)
            session.flush()
            print(f"✅ Registered model '{model_name}' in database")
        else:
            updated = False
            if metadata.get("description") and ai_model.description != metadata.get("description"):
                ai_model.description = metadata["description"]
                updated = True
            if ai_model.path != relative_path:
                ai_model.path = relative_path
                updated = True
            if updated:
                session.add(ai_model)
                session.flush()
                print(f"♻️  Updated registry entry for '{model_name}'")

        prepared_models[model_name] = ai_model

    return prepared_models


def seed_default_settings(session: Session):
    """Seed default inference and storage settings."""
    models = seed_detection_models(session, commit=False)

    if not models:
        raise RuntimeError("No AI models were prepared during seeding")

    default_model = models.get(DEFAULT_YOLO_MODEL) or next(iter(models.values()))

    inference_settings = session.query(InferenceSettings).first()
    if not inference_settings:
        inference_settings = InferenceSettings(
            model_id=default_model.id,
            min_detection_threshold=0.5,
        )
        session.add(inference_settings)
    else:
        valid_model_ids = {model.id for model in models.values()}
        if inference_settings.model_id not in valid_model_ids:
            inference_settings.model_id = default_model.id
        if inference_settings.min_detection_threshold is None:
            inference_settings.min_detection_threshold = 0.5
        session.add(inference_settings)

    storage_settings = session.query(StorageSettings).first()
    if not storage_settings:
        storage_settings = StorageSettings(storage_type="local", retention_days=30)
        session.add(storage_settings)
    else:
        session.add(storage_settings)

    session.commit()
    print("✅ Default system settings seeded successfully.")
    
def seed_default_zones(db):
    default_zone = db.query(Zone).filter_by(name="Default").first()
    if not default_zone:
        zone = Zone(name="Default", description="Default system zone")
        db.add(zone)
        db.commit()

def seed_detection_models(db: Session, *, commit: bool = True) -> Dict[str, AIModels]:
    """Seed detection models and optionally commit the session."""
    prepared = _prepare_yolo_models(db)

    if commit:
        db.commit()

    print("🧠 Detection models ensured successfully.")
    return prepared

def seed_default_user(db):
    """Seed a default admin user if none exists."""
    existing = db.query(User).filter_by(username="admin").first()
    if existing:
        print("Default admin user already exists.")
        return existing

    user = User(
        firstname="Admin",
        lastname="User",
        middlename=None,
        username="admin",
        email="admin@nexguard.local",
        password=auth_service.hash_password("Admin@12345"),
        phone=None,
        is_active=True,
        status= UserStatus.APPROVED,
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print("Default admin user seeded successfully.")
    return user