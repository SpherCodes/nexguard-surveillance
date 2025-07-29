from pylibsrtp import Session

from ..core.models import Zone

from ..core.models import InferenceSettings, StorageSettings


def seed_default_settings(session:Session):
    """Seed default inference and storage settings"""
    # Create default inference settings
    default_inference = InferenceSettings(
        model="yolo11n",
        min_detection_threshold=0.5
    )
    session.add(default_inference)

    # Create default storage settings
    default_storage = StorageSettings(
        storage_type="local",
        retention_days=30
    )
    session.add(default_storage)

    session.commit()
    print("Default settings seeded successfully.")
    
def seed_default_zones(db):
    default_zone = db.query(Zone).filter_by(name="Default").first()
    if not default_zone:
        zone = Zone(name="Default", description="Default system zone")
        db.add(zone)
        db.commit()

def seed_detection_models(db):
    """Seed default detection models"""
    models = [
        {"name": "yolo11n", "path": "models/yolo11n.pt"},
        {"name": "yolo12n", "path": "models/yolo12n.pt"}
    ]
    
    for model in models:
        exists = db.query(InferenceSettings).filter_by(model=model["name"]).first()
        if not exists:
            inference_settings = InferenceSettings(
                model=model["name"],
                model_path=model["path"],
                min_detection_threshold=0.5
            )
            db.add(inference_settings)
    
    db.commit()
    print("Default detection models seeded successfully.")