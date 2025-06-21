from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "NexGuard API"
    }

@router.get("/detailed")
async def detailed_health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "NexGuard API",
        "components": {
            "api": "healthy",
            "inference_engine": "healthy", 
            "video_capture": "healthy"
        }
    }
