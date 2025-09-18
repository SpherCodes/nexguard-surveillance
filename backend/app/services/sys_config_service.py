from ..core.models import AIModels, InferenceSettings
from ..schema.sysconfig import SysInferenceConfig
from sqlalchemy.orm import Session
from typing import Dict, List, Any

class SysConfigService:
    """Service for managing system configuration settings."""
    def __init__(self):
        pass
    
    def _serialize_model(self, model: AIModels) -> Dict[str, Any]:
        """Convert AIModels ORM object to serializable dict"""
        return {
            "id": model.id,
            "name": model.name,
            "description": model.description,
            "path": model.path
        }

    def get_inference_config(self, db: Session) -> SysInferenceConfig:
        """Get current inference settings as serializable dict"""
        inferenceSettings = db.query(InferenceSettings).first()
        if not inferenceSettings:
            raise ValueError("Inference settings not found")
            
        model = db.query(AIModels).filter(AIModels.id == inferenceSettings.model_id).first()
        if not model:
            raise ValueError("AI model not found for inference settings")
            
        available_models = db.query(AIModels).all()
        serialized_available = [self._serialize_model(m) for m in available_models]
        
        return SysInferenceConfig(
            min_detection_threshold=inferenceSettings.min_detection_threshold,
            model=model.name,
            available_models=serialized_available
        )

    def update_inference_settings(self, db: Session, conf: SysInferenceConfig) -> SysInferenceConfig:
        """Update inference settings and return updated config"""
        inferenceSettings = db.query(InferenceSettings).first()
        if not inferenceSettings:
            raise ValueError("Inference settings not found")
            
        # Handle both dict and Pydantic model input
        model_name = getattr(conf, "model", None) or (conf.get("model") if isinstance(conf, dict) else None)
        min_thresh = getattr(conf, "min_detection_threshold", None) or (conf.get("min_detection_threshold") if isinstance(conf, dict) else None)
        
        if model_name is None:
            raise ValueError("Missing 'model' in configuration")
            
        model = db.query(AIModels).filter(AIModels.name == model_name).first()
        if not model:
            raise ValueError(f"AI model '{model_name}' not found")
        
        if min_thresh is not None:
            inferenceSettings.min_detection_threshold = min_thresh
        inferenceSettings.model_id = model.id
        
        db.add(inferenceSettings)
        db.commit()
        db.refresh(inferenceSettings)
        
        # Return updated config with all available models
        available_models = db.query(AIModels).all()
        serialized_available = [self._serialize_model(m) for m in available_models]
        
        return SysInferenceConfig(
            min_detection_threshold=inferenceSettings.min_detection_threshold,
            model=model.name,
            available_models=serialized_available
        )

# Export singleton instance
sys_config_service = SysConfigService()