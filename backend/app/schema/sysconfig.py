from pydantic import BaseModel
from typing import List, Optional

class AIModelInfo(BaseModel):
    """AI Model Information for API responses"""
    id: int
    name: str
    description: Optional[str] = None
    path: str

class SysInferenceConfig(BaseModel):
    """System Inference Configuration"""
    min_detection_threshold: float
    model: str
    available_models: List[AIModelInfo] = []