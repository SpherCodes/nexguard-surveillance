from typing import List, Optional
from sqlalchemy.orm import Session

from ..core.models import Zone
from ..schema.zone import ZoneCreate, ZoneUpdate, ZoneWithCameras
from ..utils.database_crud import CRUDBase


class ZoneService(CRUDBase[Zone, ZoneCreate, ZoneUpdate]):
    """Service for managing zones"""
    
    def __init__(self):
        super().__init__(Zone)
    
    def get_by_id(self, db: Session, zone_id: int) -> Optional[Zone]:
        """Get zone by ID"""
        return db.query(Zone).filter(Zone.id == zone_id).first()

    def get_all_zones(self, db: Session) -> List[Zone]:
        """Get all zones"""
        return db.query(Zone).all()

    def create_zone(self, db: Session, zone_data: ZoneCreate) -> Zone:
        """Create a new zone"""
        return self.create(db, obj_in=zone_data)

    def update_zone(self, db: Session, zone_id: int, zone_data: ZoneUpdate) -> Optional[Zone]:
        """Update a zone with validation"""
        zone = self.get_by_id(db, zone_id)
        if not zone:
            return None
        return self.update(db, db_obj=zone, obj_in=zone_data)

    def delete_zone(self, db: Session, zone_id: int) -> Optional[Zone]:
        """Delete a zone"""
        zone = self.get_by_id(db, zone_id)
        if not zone:
            return None
        db.delete(zone)
        db.commit()
        return zone
    
zone_service = ZoneService()