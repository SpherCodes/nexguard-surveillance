import base64
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta

from ..Settings import settings

from ..core.models import Detection, Camera
from ..schema import DetectionCreate, DetectionUpdate, Detection as DetectionSchema
from ..utils.database_crud import CRUDBase, DatabaseManager


class DetectionService(CRUDBase[Detection, DetectionCreate, DetectionUpdate]):
    """Service for detection operations"""
    def __init__(self):
        super().__init__(Detection)

    def create_detection(self, db: Session, detection_data: DetectionCreate) -> Detection:
        """Create a new detection"""
        if not DatabaseManager.validate_foreign_key(db, Camera, detection_data.camera_id):
            raise ValueError(f"Camera with id {detection_data.camera_id} does not exist")

        return self.create(db, obj_in=detection_data)

    def get_by_camera(
        self, 
        db: Session, 
        camera_id: int, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Detection]:
        """Get detections for a specific camera"""
        return (db.query(Detection)
                .filter(Detection.camera_id == camera_id)
                .order_by(desc(Detection.timestamp))
                .offset(skip)
                .limit(limit)
                .all())

    def get_recent_detections(
        self, 
        db: Session, 
        hours: int = 24, 
        limit: int = 100
    ) -> List[Detection]:
        """Get recent detections within specified hours"""
        since_timestamp = (datetime.now() - timedelta(hours=hours)).timestamp()
        return (db.query(Detection)
                .filter(Detection.timestamp >= since_timestamp)
                .order_by(desc(Detection.timestamp))
                .limit(limit)
                .all())
    
    def get_by_date(
        self, 
        db: Session, 
        date: datetime, 
        camera_id: Optional[int] = None
    ) -> List[DetectionSchema]:
        """Get detections for a specific date"""
        start_of_day = date
        end_of_day   = start_of_day + timedelta(days=1)

        # eager-load all media
        query = (
            db.query(Detection)
              .options(joinedload(Detection.media))
              .filter(
                  Detection.timestamp >= start_of_day.timestamp(),
                  Detection.timestamp <  end_of_day.timestamp()
              )
        )

        if camera_id:
            query = query.filter(Detection.camera_id == camera_id)

        detections = query.order_by(desc(Detection.timestamp)).all()
        try:
            for det in detections:
                #Load detection data
                det.image_media = [m for m in det.media if m.media_type == "image"]
                #Load image data if available
                for m in det.image_media:
                    abs_path = Path(settings.STORAGE_DIR) / m.path
                    if abs_path.exists():
                        with open(abs_path, "rb") as f:
                            m.image_data = base64.b64encode(f.read()).decode("ascii")
        except Exception as e:
            print(f"Error loading image data: {e}")
        return detections
    

    def get_unnotified_detections(self, db: Session) -> List[Detection]:
        """Get all detections that haven't been notified"""
        return (db.query(Detection)
                .filter(Detection.notified == False)
                .order_by(desc(Detection.timestamp))
                .all())

    def mark_as_notified(self, db: Session, detection_id: int) -> Optional[Detection]:
        """Mark a detection as notified"""
        detection = self.get(db, detection_id)
        if detection:
            detection.notified = True
            db.commit()
            db.refresh(detection)
        return detection

    def get_detection_stats(self, db: Session, camera_id: Optional[int] = None) -> dict:
        """Get detection statistics"""
        query = db.query(Detection)
        if camera_id:
            query = query.filter(Detection.camera_id == camera_id)
        
        total_detections = query.count()
        notified_count = query.filter(Detection.notified == True).count()
        
        type_stats = {}
        for detection_type, count in query.with_entities(
            Detection.detection_type, 
            Detection.id
        ).group_by(Detection.detection_type).all():
            type_stats[detection_type] = count
        
        return {
            "total_detections": total_detections,
            "notified_count": notified_count,
            "unnotified_count": total_detections - notified_count
        }

    def cleanup_old_detections(self, db: Session, days: int = 30) -> int:
        """Remove detections older than specified days"""
        cutoff_timestamp = (datetime.now() - timedelta(days=days)).timestamp()
        deleted_count = (db.query(Detection)
                        .filter(Detection.timestamp < cutoff_timestamp)
                        .delete())
        db.commit()
        return deleted_count


detection_service = DetectionService()