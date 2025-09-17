import base64
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta

from ..Settings import settings

from ..core.models import Detection, Camera, Media
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
                    print(f"Loading image data for media id {m.id} from path {m.path}")
                    abs_path = settings.get_absolute_path(m.path)
                    print(f"Absolute path: {abs_path}")
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
    
    def get_media_filepath( self, db: Session, id: int, media_type: str) -> Optional[str]:
        """Get the file path of a media item by its ID (return Absolute path if exists)"""
        media = db.query(Media).filter(Media.detection_id == id, Media.media_type == media_type).first()
        
        if media:
            abs_path = settings.get_absolute_path(media.path)
            print(f"Resolved media path: {abs_path}")

            if abs_path.exists():
                return str(abs_path)
            return None
        return None

    def cleanup_old_detections(self, db: Session, days: int = 30) -> int:
        """Remove detections older than specified days"""
        cutoff_timestamp = (datetime.now() - timedelta(days=days)).timestamp()
        deleted_count = (db.query(Detection)
                        .filter(Detection.timestamp < cutoff_timestamp)
                        .delete())
        db.commit()
        return deleted_count


detection_service = DetectionService()