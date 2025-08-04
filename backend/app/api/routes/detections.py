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
from ...dependencies import DatabaseDep, get_detection_event_manager, get_db

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