from fastapi import APIRouter

from .routes import webrtc_stream, health, cameras, inference, detections

api_router = APIRouter()

# Include route modules  
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])  
api_router.include_router(webrtc_stream.router, prefix="/cameras", tags=["webrtc"])
api_router.include_router(inference.router, prefix="/inference", tags=["inference"])
api_router.include_router(detections.router, prefix="/detections", tags=["detections"])
