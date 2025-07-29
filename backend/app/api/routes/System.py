from turtle import st
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from ...dependencies import DatabaseDep

#TODO: Refactor the settings endpoint to use a settings service 
# instead of direct database access

from ...schema.settings import InferenceSettings, StorageSettings
from ...core.models import InferenceSettings as inference_model, StorageSettings as storage_model

router = APIRouter()

@router.get("/inference",response_model=InferenceSettings)
async def get_system_config(
    db: DatabaseDep,
):
    try:
        inference_settings = db.query(inference_model).first()
        if not inference_settings:
            raise HTTPException(status_code=404, detail="Inference settings not found")

        return InferenceSettings.model_validate(inference_settings)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
            )

@router.get("/storage", response_model=StorageSettings)
async def get_storage_config(
    db: DatabaseDep,
):
    try:
        storage_settings = db.query(inference_model).first()
        if not storage_settings:
            raise HTTPException(status_code=404, detail="Storage settings not found")

        return StorageSettings.model_validate(storage_settings)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
        )

@router.put("/inference", response_model=InferenceSettings)
async def update_inference_settings(
    settings: InferenceSettings,
    db: DatabaseDep,
):
    try:
        inference_settings = db.query(inference_model).first()
        if not inference_settings:
            raise HTTPException(status_code=404, detail="Inference settings not found")

        # Update the settings
        inference_settings.model = settings.model
        inference_settings.min_detection_threshold = settings.confidence
        inference_settings.model_path = settings.model_path
        inference_settings.updated_at = datetime.now()

        db.commit()
        db.refresh(inference_settings)

        return InferenceSettings.model_validate(inference_settings)
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
