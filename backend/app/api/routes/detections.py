from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from typing import List, Optional
import os
from datetime import datetime, timedelta
import time
from sqlalchemy.orm import Session

from ...core.models import Detection, Media
from ...utils.detection_manager import DetectionEventManager
from ...dependencies import get_detection_event_manager, get_db

router = APIRouter()

@router.get("/recent")
async def get_recent_detections(
    # camera_id: Optional[str] = None,
    # detection_type: Optional[str] = None,
    # hours: int = 24,
    db: Session = Depends(get_db)
):
    """Get recent detection events from database"""
    # Calculate the timestamp threshold
    # cutoff_time = time.time() - (hours * 3600)
    
    # Build query
    # query = db.query(Detection).filter(Detection.timestamp > cutoff_time)
    
    # if camera_id:
    #     query = query.filter(Detection.camera_id == camera_id)
        
    # if detection_type:
    #     query = query.filter(Detection.detection_type == detection_type)
        
    # query = query.order_by(Detection.timestamp.desc())
    
    # Execute query
    detections = db.query(Detection).all()
    
    # Convert to API-friendly format
    result = []
    for detection in detections:
        # Find associated image
        image_media = db.query(Media).filter(
            Media.detection_id == detection.id,
            Media.media_type == "image"
        ).first()
        # Find associated thumbnail
        thumbnail_media = db.query(Media).filter(
            Media.detection_id == detection.id,
            Media.media_type == "thumbnail"
        ).first()
        # Read thumbnail file as base64 if available
        thumbnail_b64 = None
        if thumbnail_media:
            file_path = os.path.join("data/storage", thumbnail_media.path)
            if os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    import base64
                    thumbnail_b64 = base64.b64encode(f.read()).decode("utf-8")
        result.append({
            "id": detection.id,
            "camera_id": detection.camera_id,
            "timestamp": detection.timestamp,
            "datetime": datetime.fromtimestamp(detection.timestamp).isoformat(),
            "detection_type": detection.detection_type,
            "confidence": detection.confidence,
            "has_image": bool(image_media),
            "notified": detection.notified,
            "thumbnail": thumbnail_b64
        })
        
    return result

@router.get('/detections/{date}')
async def get_detections_by_date(
    date: str,
    db: Session = Depends(get_db)
):
    """Get detections for a specific date"""
    try:
        # Parse the date string
        date_obj = datetime.strptime(date, "%Y-%m-%d")
        start_timestamp = int(date_obj.timestamp())
        end_timestamp = int((date_obj + timedelta(days=1)).timestamp())
        
        # Query detections within the date range
        detections = db.query(Detection).filter(
            Detection.timestamp >= start_timestamp,
            Detection.timestamp < end_timestamp
        ).all()
        if not detections:
            return []
        return [detection.to_dict() for detection in detections]
    
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

@router.get("/stats")
async def get_detection_stats(db: Session = Depends(get_db)):
    """Get detection statistics"""
    # Get total counts
    total_today = db.query(Detection).filter(
        Detection.timestamp > time.time() - 86400
    ).count()
    
    human_today = db.query(Detection).filter(
        Detection.timestamp > time.time() - 86400,
        Detection.detection_type == "person"
    ).count()
    
    return {
        "total_detections_today": total_today,
        "human_detections_today": human_today,
        "total_detections": db.query(Detection).count(),
        "total_media_files": db.query(Media).count()
    }

@router.get("/{detection_id}/image")
async def get_detection_image(
    detection_id: int,
    db: Session = Depends(get_db)
):
    """Get detection image by ID"""
    # Find the image path in database
    media = db.query(Media).filter(
        Media.detection_id == detection_id,
        Media.media_type == "image"
    ).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Full path to the image
    file_path = os.path.join("data/storage", media.path)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image file not found")
        
    return FileResponse(file_path, media_type="image/jpeg")

@router.get("/{detection_id}/thumbnail")
async def get_detection_thumbnail(
    detection_id: int,
    db: Session = Depends(get_db)
):
    """Get thumbnail for a detection"""
    # Find the thumbnail path in database
    media = db.query(Media).filter(
        Media.detection_id == detection_id,
        Media.media_type == "thumbnail"
    ).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    # Full path to the image
    file_path = os.path.join("data/storage", media.path)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Thumbnail file not found")
        
    return FileResponse(file_path, media_type="image/jpeg")

@router.delete("/{detection_id}")
async def delete_detection(
    detection_id: int,
    db: Session = Depends(get_db)
):
    """Delete detection and associated media"""
    # Find the detection
    detection = db.query(Detection).filter(Detection.id == detection_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    # Find associated media
    media_files = db.query(Media).filter(Media.detection_id == detection_id).all()
    
    # Delete media files
    for media in media_files:
        try:
            file_path = os.path.join("data/storage", media.path)
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error deleting file {media.path}: {e}")
        
        # Delete media record
        db.delete(media)
    
    # Delete detection
    db.delete(detection)
    db.commit()
    
    return {"message": f"Detection {detection_id} deleted successfully"}
