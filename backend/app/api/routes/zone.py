from typing import List
from fastapi import APIRouter, HTTPException, status
from ...api import router
from ...dependencies import DatabaseDep, ZoneServiceDep

from ...schema import (
    Zone, ZoneCreate, ZoneUpdate, ZoneWithCameras
)

router = APIRouter()

@router.get("/", response_model=List[Zone])
async def get_zones(
    db: DatabaseDep,
    zone_service: ZoneServiceDep
):
    """Get all zones with optional pagination"""
    try:
        zones = zone_service.get_all_zones(db)
        return zones
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve zones: {str(e)}"
        )
        
@router.post("/", response_model=Zone, status_code=status.HTTP_201_CREATED)
async def create_zone(
    zone_data: ZoneCreate,
    db: DatabaseDep,
    zone_service: ZoneServiceDep
):
    """Create a new zone"""
    try:
        zone = zone_service.create_zone(db, zone_data)
        return zone
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create zone: {str(e)}"
        )