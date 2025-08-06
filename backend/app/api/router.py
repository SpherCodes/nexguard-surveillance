from fastapi import APIRouter

from .routes import System, webrtc_stream, cameras, inference, detections, zone , auth

api_router = APIRouter()

api_router.include_router(System.router, prefix="/system", tags=["system"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])
api_router.include_router(zone.router, prefix="/zones", tags=["zones"])
api_router.include_router(webrtc_stream.router, prefix="/webrtc", tags=["webrtc"])
api_router.include_router(inference.router, prefix="/inference", tags=["inference"])
api_router.include_router(detections.router, prefix="/detections", tags=["detections"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])