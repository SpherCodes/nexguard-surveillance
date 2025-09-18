from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import  datetime

from ..core.models import Camera, Zone
from ..schema import CameraCreate, CameraUpdate, Camera as CameraSchema
from ..utils.database_crud import CRUDBase, DatabaseManager


class CameraService(CRUDBase[Camera, CameraCreate, CameraUpdate]):
    """Service for camera operations"""
    
    def __init__(self):
        super().__init__(Camera)

    def get_by_camera_id(self, db: Session, camera_id: int) -> Optional[Camera]:
        """Get camera by camera_id"""
        return db.query(Camera).filter(Camera.id == camera_id).first()

    def get_by_zone(self, db: Session, zone_id: int) -> List[Camera]:
        """Get all cameras in a specific zone"""
        return db.query(Camera).filter(Camera.zone_id == zone_id).all()

    def get_active_cameras(self, db: Session) -> List[Camera]:
        """Get all enabled cameras"""
        return db.query(Camera).filter(Camera.enabled == True).all()

    def create_camera(self, db: Session, camera_data: CameraCreate) -> Camera:
        """Create a new camera"""
        if camera_data.zone_id is not None:
            if not DatabaseManager.validate_foreign_key(db, Zone, camera_data.zone_id):
                raise ValueError(f"Zone with id {camera_data.zone_id} does not exist")
        
        return self.create(db, obj_in=camera_data)

    def update_camera(self, db: Session, id: int, camera_data: CameraUpdate) -> Optional[Camera]:
        """Update camera with validation"""
        camera = self.get_by_camera_id(db, id)
        if not camera:
            return None
        
        if camera_data.zone_id is not None:
            if not DatabaseManager.validate_foreign_key(db, Zone, camera_data.zone_id):
                raise ValueError(f"Zone with id {camera_data.zone_id} does not exist")
        
        return self.update(db, db_obj=camera, obj_in=camera_data)

    def update_last_active(self, db: Session, id: int) -> Optional[Camera]:
        """Update camera's last active timestamp"""
        camera = self.get_by_camera_id(db, id)
        if camera:
            camera.last_active = datetime.now()
            db.commit()
            db.refresh(camera)
        return camera

    def disable_camera(self, db: Session, camera_id: int) -> Optional[Camera]:
        """Disable a camera"""
        camera = self.get_by_camera_id(db, camera_id)
        if camera:
            camera.enabled = False
            camera.last_active = datetime.now()
            db.commit()
            db.refresh(camera)
        return camera

    def enable_camera(self, db: Session, camera_id: int) -> Optional[Camera]:
        """Enable a camera"""
        camera = self.get_by_camera_id(db, camera_id)
        if camera:
            camera.enabled = True
            camera.last_active = datetime.now()
            db.commit()
            db.refresh(camera)
        return camera

camera_service = CameraService()