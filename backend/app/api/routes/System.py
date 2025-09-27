from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from ...services.sys_config_service import SysConfigService
from ...schema.sysconfig import SysInferenceConfig

from ...dependencies import DatabaseDep, get_sys_config_service

#TODO: Refactor the settings endpoint to use a settings service 
# instead of direct database access

from ...schema.settings import StorageSettings
from ...core.models import StorageSettings as storage_model

router = APIRouter()

@router.get("/inference", response_model=SysInferenceConfig)
async def get_system_config(
    db: DatabaseDep,
    sys_config_service: SysConfigService = Depends(get_sys_config_service)
) -> SysInferenceConfig:
    try:
        inference_settings = sys_config_service.get_inference_config(db)
        print(f"this the inference_config: {inference_settings}")
        return inference_settings
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
            )

@router.get("/storage", response_model=StorageSettings)
async def get_storage_config(
    db: DatabaseDep,
):
    try:
        storage_settings = db.query(storage_model).first()
        if not storage_settings:
            raise HTTPException(status_code=404, detail="Storage settings not found")

        return StorageSettings.model_validate(storage_settings)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
        )

@router.put("/inference", response_model=SysInferenceConfig)
async def update_inference_settings(
    settings: SysInferenceConfig,
    db: DatabaseDep,
    sys_config_service: SysConfigService = Depends(get_sys_config_service)
):
    try:
        updated_config = sys_config_service.update_inference_settings(db, settings)
        return updated_config
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
        )

@router.put("/storage", response_model=StorageSettings)
async def update_storage_settings(
    settings: StorageSettings,
    db: DatabaseDep,
):
    try:
        storage_settings = db.query(storage_model).first()
        if not storage_settings:
            raise HTTPException(status_code=404, detail="Storage settings not found")

        # Update the settings
        storage_settings.storage_type = settings.storage_type
        storage_settings.retention_days = settings.retention_days
        storage_settings.updated_at = datetime.now()

        db.commit()
        db.refresh(storage_settings)

        return StorageSettings.model_validate(storage_settings)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
        )
