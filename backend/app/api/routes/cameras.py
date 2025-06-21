from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel

from ...dependencies import get_video_capture
from ...services.video_capture import CameraConfig, VideoCapture as video_capture

router = APIRouter()

class CameraConfigRequest(BaseModel):
    camera_id: str
    url: str
    fps_target: int = 15
    resolution: tuple = (640, 480)
    buffer_size: int = 10
    enabled: bool = True

class CameraStatusResponse(BaseModel):
    camera_id: str
    status: str
    fps: float
    resolution: tuple
    enabled: bool

@router.get("/", response_model=List[CameraStatusResponse])
async def list_cameras( video_capture: video_capture =  Depends(get_video_capture)):
    """Get list of all cameras and their status"""
    cameras = []
    for camera_id, config in video_capture.cameras.items():
        status = "running" if config.enabled else "stopped"
        cameras.append(CameraStatusResponse(
            camera_id=camera_id,
            status=status,
            fps=config.fps_target,
            resolution=config.resolution,
            enabled=config.enabled
        ))
    return cameras

@router.post("/add")
async def add_camera(camera_config: CameraConfigRequest, video_capture = Depends(get_video_capture)):
    """Add a new camera to the system"""
    try:
        config = CameraConfig(
            camera_id=camera_config.camera_id,
            url=camera_config.url,
            fps_target=camera_config.fps_target,
            resolution=camera_config.resolution,
            buffer_size=camera_config.buffer_size,
            enabled=camera_config.enabled
        )
        video_capture.add_camera(config)
        return {"message": f"Camera {camera_config.camera_id} added successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.post("/{camera_id}/start", operation_id="start_camera_unique")
async def start_camera(
    camera_id: str, 
    video_capture: video_capture = Depends(get_video_capture)
):
    """Start a specific camera"""
    
    try:
        # Check if camera exists first
        # if camera_id not in video_capture.cameras:
        #     raise HTTPException(
        #         status_code=404, 
        #         detail=f"Camera {camera_id} not found"
        #     )
            
        # Start the camera
        video_capture._start_camera_thread(camera_id)
        return {"message": f"Camera {camera_id} started successfully"}
        
    except ValueError as e:
        # For specific validation errors
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        # For connection issues
        raise HTTPException(
            status_code=503, 
            detail=f"Failed to connect to camera {camera_id}: {str(e)}"
        )
    except Exception as e:
        # Log the unexpected error
        print(f"Unexpected error when starting camera {camera_id}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error when starting camera {camera_id}"
        )

@router.post("/{camera_id}/stop")
async def stop_camera(
    camera_id: str,
    video_capture: video_capture = Depends(get_video_capture)
):
    """Stop a specific camera"""
    try:
        video_capture.stop_camera(camera_id)
        return {"message": f"Camera {camera_id} stopped successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{camera_id}")
async def remove_camera(
    camera_id: str,
    video_capture: video_capture = Depends(get_video_capture)
):
    """Remove a camera from the system"""
    try:
        video_capture.remove_camera(camera_id)
        return {"message": f"Camera {camera_id} removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
