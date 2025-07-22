from fastapi import APIRouter, Depends, HTTPException, Path
from typing import List, Tuple
from pydantic import BaseModel, HttpUrl, field_validator
from requests import Session

from ...core.database import Camera, Zone

from ...dependencies import get_db, get_video_capture
from ...services.video_capture import CameraConfig, VideoCapture as video_capture

router = APIRouter()

class CameraConfigRequest(BaseModel):
    name: str = "Default"
    url: str
    enabled: bool = False
    location: str = "Unknown"
    zoneId: int = 0

    # @field_validator("url")
    # @classmethod
    # def url_must_not_be_empty(cls, v: str) -> str:
    #     if not v.strip():
    #         raise ValueError("Camera URL must not be empty")
    #     return v
class CameraStatusResponse(BaseModel):
    name:str
    camera_id: int
    enabled: bool
    location: str = "Unknown"
    zoneId: int = 0

@router.get("/", response_model=List[CameraStatusResponse])
async def list_cameras( 
        video_capture: video_capture =  Depends(get_video_capture),
        db:Session = Depends(get_db)
    ):
    """Get list of all cameras and their status"""
    try:
        cameras = db.query(Camera).all()
        if not cameras:
            return []
        
        response = []
        for cam in cameras:
            response.append(CameraStatusResponse(
                name=cam.name,
                camera_id=cam.camera_id,
                enabled=cam.enabled,
                location=cam.location,
                zoneId=cam.zone_id if cam.zone_id is not None else 0
            ))
        return response
    except Exception as e:
        print(f"Error listing cameras: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/add")
async def add_camera(
    camera_config: CameraConfigRequest, 
    video_capture: video_capture = Depends(get_video_capture),
    db: Session = Depends(get_db)
):
    """Add a new camera to the system"""
    try:
        # Add to database
        db_camera = Camera(
            name = camera_config.name,
            url=camera_config.url,
            enabled=camera_config.enabled,
            location=camera_config.location,
            zone_id=camera_config.zoneId if camera_config.zoneId is not None else 0
        )


        db.add(db_camera)
        db.commit()
        db.refresh(db_camera)
        
        camera = db.query(Camera).order_by(Camera.camera_id.desc()).first()
        
        config = CameraConfig(
            camera_id=camera.camera_id,
            url=camera.url,
            enabled=camera.enabled,
            location=camera.location,
        )
        
        # Add to video capture service
        video_capture.add_camera(config)
        
        
        return {"message": f"Camera added successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/update/{id}")
async def update_camera(
    id: int = Path(..., description="Camera ID"),
    camera_config: CameraConfigRequest = ...,
    video_capture: video_capture = Depends(get_video_capture),
    db: Session = Depends(get_db)
):
    """Update an existing camera"""
    try:
        print(f"Updating camera {id} with config: {camera_config}")
        # Find existing camera
        existing_camera = db.query(Camera).filter(Camera.camera_id == id).first()
        if not existing_camera:
            raise HTTPException(status_code=404, detail="Camera not found")
        
        # Update database record
        existing_camera.name = camera_config.name
        existing_camera.url = camera_config.url
        existing_camera.enabled = camera_config.enabled
        existing_camera.location = camera_config.location
        existing_camera.zone_id = camera_config.zoneId if camera_config.zoneId is not None else 0

        db.commit()
        
        # Update in video capture service
        video_capture.update_camera(existing_camera)
        
        return {"message": "Camera updated successfully"}
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
    video_capture: video_capture = Depends(get_video_capture),
    db: Session = Depends(get_db)
):
    """Remove a camera from the system"""
    try:
        # Check if camera exists in DB
        existing = db.query(Camera).filter(Camera.camera_id == camera_id).first()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")
        
        # Stop the camera if it's running
        # video_capture.stop_camera(camera_id)
        
        # Remove from video capture service
        # video_capture.remove_camera(camera_id)
        
        # Remove from database
        db.delete(existing)
        db.commit()
        
        return {"message": f"Camera {camera_id} removed successfully"}
    except Exception as e:
        print(f"Error removing camera {camera_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

#Zone Management endpoints
@router.get("/zones")
async def list_zones(
    db: Session = Depends(get_db)
):
    """Get list of all zones"""
    zones = db.query(Zone).all()
    return zones

@router.post("/zones/add/{zone_name}")
async def add_zone(
    zone_name: str,
    db: Session = Depends(get_db)
):
    """Add a new zone"""
    try:
        existing = db.query(Zone).filter(Zone.name == zone_name).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Zone {zone_name} already exists")
        
        new_zone = Zone(name=zone_name)
        db.add(new_zone)
        db.commit()
        
        return {"message": f"Zone {zone_name} added successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))