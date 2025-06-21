from fastapi import APIRouter

from .routes import webrtc_stream
from .routes import health, cameras, inference

api_router = APIRouter()

# Include route modules  
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])  
api_router.include_router(webrtc_stream.router, prefix="/cameras", tags=["webrtc"])
