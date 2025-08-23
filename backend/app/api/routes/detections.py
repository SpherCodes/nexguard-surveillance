from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from typing import List, Optional
import os
from datetime import datetime, timedelta
import time
from sqlalchemy.orm import Session

from ...services.detection_service import detection_service

from ...schema import (
    Detection, Media
)

from ...utils.detection_manager import DetectionEventManager
from ...dependencies import DatabaseDep, get_db

router = APIRouter()

@router.get("/date/{date}", response_model=List[Detection])
async def get_recent_detections(
    date: datetime,
    db: DatabaseDep
):
    """Get recent detections with images by date"""
    try:
        detections = detection_service.get_by_date(
        db=db,
        date=date
    )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve detections: {str(e)}"
        )
    
    return detections

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

@router.post("/test-detection")
async def trigger_test_detection(
    db: DatabaseDep
):
    """Trigger a test detection for debugging notifications"""
    try:
        # Create a test detection record
        detection_data = {
            "camera_id": 1,
            "detection_type": "person",
            "confidence": 0.95,
            "bbox_x1": 100,
            "bbox_y1": 100,
            "bbox_x2": 200,
            "bbox_y2": 200,
            "timestamp": datetime.now().timestamp()
        }
        
        detection = detection_service.create(db=db, detection_data=detection_data)
        
        # Trigger the detection event manager to send alerts
        detection_manager = DetectionEventManager()
        await detection_manager.send_detection_alert(detection)
        
        return {
            "success": True,
            "message": "Test detection created and alert sent",
            "detection_id": detection.id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create test detection: {str(e)}"
        )