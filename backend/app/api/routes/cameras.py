"""
Camera API endpoints with validation
"""
#TODO: Fix update endpoint camera is being updated but responds with a
# an error code:500 when updating enabled status
#TODO:Automatically start and stop without having to restart the server


from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from ...schema import (
    Camera, CameraCreate, CameraUpdate, CameraWithRelations
)
from ...dependencies import DatabaseDep, CameraServiceDep, VideoCaptureServiceDep
from ...services.video_capture import CameraConfig

router = APIRouter()


@router.get("/", response_model=List[Camera])
async def get_cameras(
    db: DatabaseDep,
    camera_service: CameraServiceDep,
    skip: int = 0,
    limit: int = 100,
    zone_id: Optional[int] = None,
    enabled_only: bool = False
):
    """Get all cameras with optional filtering"""
    try:
        if zone_id:
            cameras = camera_service.get_by_zone(db, zone_id)
        elif enabled_only:
            cameras = camera_service.get_active_cameras(db)
        else:
            cameras = camera_service.get_multi(db, skip=skip, limit=limit)
        
        return cameras
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve cameras: {str(e)}"
        )


@router.get("/{camera_id}", response_model=CameraWithRelations)
async def get_camera(
    camera_id: int,
    db: DatabaseDep,
    camera_service: CameraServiceDep
):
    """Get a specific camera by ID"""
    camera = camera_service.get_by_camera_id(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera with ID {camera_id} not found"
        )
    return camera


@router.post("/", response_model=Camera, status_code=status.HTTP_201_CREATED)
async def create_camera(
    camera_data: CameraCreate,
    db: DatabaseDep,
    camera_service: CameraServiceDep,
    video_capture: VideoCaptureServiceDep
):
    """Create a new camera with validation"""
    try:
        print(f"Creating camera: {camera_data}")
        camera = camera_service.create_camera(db, camera_data)
        if camera.enabled:
            config = CameraConfig(
                camera_id=camera.id,
                url=camera.url,
                fps_target=camera.fps_target,
                resolution=(camera.resolution_width, camera.resolution_height),
                enabled=camera.enabled,
                location=camera.location,
            )
            
            if video_capture:
                video_capture.add_camera(config)
        return camera
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create camera: {str(e)}"
        )


@router.put("/{camera_id}", response_model=Camera)
async def update_camera(
    camera_id: int,
    camera_data: CameraUpdate,
    db: DatabaseDep,
    camera_service: CameraServiceDep,
    video_capture: VideoCaptureServiceDep
):
    """Update a camera with validation"""
    try:
        updated_camera = camera_service.update_camera(db, camera_id, camera_data)
        if not updated_camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Camera with ID {camera_id} not found"
            )
            
        if any([
            camera_data.url is not None,
            camera_data.fps_target is not None,
            camera_data.resolution_width is not None,
            camera_data.resolution_height is not None,
            camera_data.enabled is not None
        ]):
            # Stop existing camera
            video_capture.stop_camera(camera_id)
            video_capture.remove_camera(camera_id)
            
            # Add updated camera if enabled
            if updated_camera.enabled:
                config = CameraConfig(
                    camera_id=updated_camera.camera_id,
                    url=updated_camera.url,
                    fps_target=updated_camera.fps_target,
                    resolution=(updated_camera.resolution_width, updated_camera.resolution_height),
                    enabled=updated_camera.enabled,
                    location=updated_camera.location
                )
                
                video_capture.add_camera(config)
                video_capture.start_camera(camera_id)
        
        return updated_camera
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update camera: {str(e)}"
        )


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: int,
    db: DatabaseDep,
    camera_service: CameraServiceDep,
    video_capture: VideoCaptureServiceDep
):
    """Delete a camera"""
    camera = camera_service.get_by_camera_id(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera with ID {camera_id} not found"
        )
    
    try:
        video_capture.remove_camera(camera_id)
        camera_service.delete(db, camera)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete camera: {str(e)}"
        )


@router.post("/{camera_id}/enable", response_model=Camera)
async def enable_camera(
    camera_id: int,
    db: DatabaseDep,
    camera_service: CameraServiceDep,
    video_capture: VideoCaptureServiceDep
):
    """Enable a camera"""
    camera = camera_service.enable_camera(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera with ID {camera_id} not found"
        )
    
    try:
        if not video_capture.is_camera_active(camera_id):
            config = CameraConfig(
                camera_id=camera.camera_id,
                url=camera.url,
                fps_target=camera.fps_target,
                resolution=(camera.resolution_width, camera.resolution_height),
                enabled=camera.enabled,
                location=camera.location
            )
            video_capture.add_camera(config)
        
        video_capture.start_camera(camera_id)
        return camera
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enable camera: {str(e)}"
        )


@router.post("/{camera_id}/disable", response_model=Camera)
async def disable_camera(
    camera_id: int,
    db: DatabaseDep,
    camera_service: CameraServiceDep,
    video_capture: VideoCaptureServiceDep
):
    """Disable a camera"""
    camera = camera_service.disable_camera(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera with ID {camera_id} not found"
        )
    
    try:
        # Stop video capture
        video_capture.stop_camera(camera_id)
        return camera
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disable camera: {str(e)}"
        )


@router.get("/{camera_id}/status")
async def get_camera_status(
    camera_id: int,
    db: DatabaseDep,
    camera_service: CameraServiceDep,
    video_capture: VideoCaptureServiceDep
):
    """Get camera status including video capture state"""
    camera = camera_service.get_by_camera_id(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera with ID {camera_id} not found"
        )
    
    video_active = video_capture.is_camera_active(camera_id)
    
    return {
        "camera_id": camera.camera_id,
        "name": camera.name,
        "enabled": camera.enabled,
        "video_active": video_active,
        "last_active": camera.last_active,
        "url": camera.url,
        "location": camera.location
    }