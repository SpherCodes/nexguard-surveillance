from sqlalchemy.orm import Session

from ..schema.user import UserStatus

from ..core.models import AIModels, Zone
from ..core.models import InferenceSettings, StorageSettings
from ..core.models import User
from ..services.auth_service import auth_service


def seed_default_settings(session:Session):
    """Seed default inference and storage settings"""
    # Ensure default AI model exists, then link inference settings to it
    model_name = "yolo11n"
    model_path = "models/yolo11n.pt"

    ai_model = session.query(AIModels).filter_by(name=model_name).first()
    if not ai_model:
        ai_model = AIModels(name=model_name, description=f"Default {model_name} model", path=model_path)
        session.add(ai_model)
        session.flush()

    # Create default inference settings referencing the model id
    default_inference = session.query(InferenceSettings).first()
    if not default_inference:
        default_inference = InferenceSettings(
            model_id=ai_model.id,
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
        {"name": "yolo11n", "path": "backend/models/yolo11n.pt"}
    ]
    
    for model in models:
        # Ensure AI model exists
        ai_model = db.query(AIModels).filter_by(name=model["name"]).first()
        if not ai_model:
            ai_model = AIModels(
                name=model["name"],
                description=f"Default {model['name']} model",
                path=model["path"]
            )
            db.add(ai_model)
            db.flush()

        # Ensure inference settings reference this model
        exists_is = db.query(InferenceSettings).filter_by(model_id=ai_model.id).first()
        if not exists_is:
            inference_settings = InferenceSettings(
                model_id=ai_model.id,
                min_detection_threshold=0.5
            )
            db.add(inference_settings)
    
    db.commit()
    print("Default detection models seeded successfully.")

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