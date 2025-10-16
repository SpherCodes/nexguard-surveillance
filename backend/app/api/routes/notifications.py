from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List
import logging

from ...schema.user import UserResponse
from ...core.database.connection import get_db
from ...dependencies import DatabaseDep, get_alert_service
from ...services.alert_service import AlertService
from ...middleware.middleware import require_approved_user
from ...core.models import UserDeviceToken
from ...schema.notification import (
    DeviceTokenRequest, 
    DeviceTokenResponse,
    NotificationPreferenceUpdate,
    TopicSubscriptionRequest,
)

logger = logging.getLogger("nexguard.notifications")

router = APIRouter(
    tags=["notifications"]
)

@router.post("/register-token")
def register_device_token(
    request: DeviceTokenRequest,
    db: DatabaseDep,
    current_user: UserResponse = Depends(require_approved_user),
    alert_service: AlertService = Depends(get_alert_service)
) :
    """Register a device token for push notifications"""
    try:
        token_record = alert_service.register_device_token(
            db=db,
            user_id=current_user.id,
            device_token=request.device_token,
            device_type=request.device_type,
            device_name=request.device_name
        )
        
        logger.info(f"Device token registered for user {current_user.username}")
        return token_record.device_token
        
    except Exception as e:
        logger.error(f"Error registering device token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register device token"
        )

@router.delete("/unregister-token/{device_token}", status_code=status.HTTP_200_OK, summary="Unregister a device token")
def unregister_device_token(
    device_token: str,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(require_approved_user),
    alert_service: AlertService = Depends(get_alert_service),
):
    """
    Remove a previously-registered FCM device token for the current user.
    Expects device token as path parameter. Deletes the token from database.
    """
    try:
        logger.info(f"Unregistering device token for user {current_user.username}: {device_token}")
        print("Unregistering device token:", device_token)
        
        # Delete the token from database (not just mark inactive)
        token_record = db.query(UserDeviceToken).filter(
            UserDeviceToken.device_token == device_token,
            UserDeviceToken.user_id == current_user.id
        ).first()
        
        if token_record:
            db.delete(token_record)
            db.commit()
            logger.info(f"Device token deleted from database for user {current_user.username}")
            print(f"✓ Device token deleted from database")
        else:
            logger.warning(f"Device token not found for user {current_user.username}")
            
        return {"message": "Device token unregistered successfully"}
    except Exception as e:
        db.rollback()
        print(f"Error unregistering device token: {e}")
        logger.exception("Error unregistering device token")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error unregistering device token error:"
        )

@router.post("/subscribe-topic")
async def subscribe_to_topic(
    request: TopicSubscriptionRequest,
    current_user: UserResponse = Depends(require_approved_user),
    alert_service: AlertService = Depends(get_alert_service),
    db: Session = Depends(get_db)
):
    """Subscribe a device token to a Firebase topic"""
    try:
        subscribed = alert_service.subscribe_to_topic(db, request.device_token, request.topic)
        if not subscribed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to subscribe device token to topic"
            )

        # Persist preference state
        pref_update = NotificationPreferenceUpdate(
            user_id=current_user.id,
            token=request.device_token,
            category=request.topic,
            enabled=True
        )
        alert_service.update_user_notification_preferences(db, pref_update)

        logger.info(f"User {current_user.id} subscribed to topic {request.topic}")
        return {"message": f"Successfully subscribed to topic {request.topic}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to subscribe to topic: {str(e)}")
        print(f"Failed to subscribe to topic: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to subscribe to topic: {str(e)}"
        )

@router.post("/unsubscribe-topic")
async def unsubscribe_from_topic(
    request: TopicSubscriptionRequest,
    current_user: UserResponse = Depends(require_approved_user),
    alert_service: AlertService = Depends(get_alert_service),
    db: Session = Depends(get_db)
):
    """Unsubscribe a device token from a Firebase topic"""
    try:
        if not alert_service.firebase_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase service not available"
            )
        
        result = alert_service.unsubscribe_from_topic(
            db,
            request.device_token,
            request.topic
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to unsubscribe device token from topic"
            )

        pref_update = NotificationPreferenceUpdate(
            user_id=current_user.id,
            token=request.device_token,
            category=request.topic,
            enabled=False
        )
        alert_service.update_user_notification_preferences(db, pref_update)

        logger.info(f"User {current_user.id} unsubscribed from topic {request.topic}")
        return {"message": f"Successfully unsubscribed from topic {request.topic}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unsubscribe from topic: {str(e)}")
        print(f"Failed to unsubscribe from topic: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unsubscribe from topic: {str(e)}"
        )

@router.get("/tokens", response_model=List[DeviceTokenResponse])
async def get_user_device_tokens(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(require_approved_user),
    alert_service: AlertService = Depends(get_alert_service)
):
    """Get all device tokens for the current user"""
    try:
        tokens = alert_service.get_user_device_tokens(db, current_user.id)
        return [
            DeviceTokenResponse(
                id=token.id,
                device_token=token.device_token,
                device_type=token.device_type,
                device_name=token.device_name,
                is_active=token.is_active,
                created_at=token.created_at
            )
            for token in tokens
        ]
    except Exception as e:
        logger.error(f"Failed to fetch device tokens for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch device tokens: {str(e)}"
        )

@router.get("/preferences")
async def get_user_notification_preferences(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(require_approved_user),
    alert_service: AlertService = Depends(get_alert_service)
):
    """Get all notification preferences for the current user"""
    try:
        preferences = alert_service.get_user_notification_preferences_dict(db, current_user.id)
        return preferences
    except Exception as e:
        logger.error(f"Failed to fetch notification preferences for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch notification preferences: {str(e)}"
        )

@router.put("/preferences")
async def update_user_notification_preferences(
    preferences: dict[str, bool] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(require_approved_user),
    alert_service: AlertService = Depends(get_alert_service)
):
    """Update notification preferences for the current user"""
    try:
        # Get user's device tokens for topic subscription/unsubscription
        user_tokens = alert_service.get_user_device_tokens(db, current_user.id)
        active_tokens = [token.device_token for token in user_tokens if token.is_active]
        
        success = alert_service.update_user_preferences_bulk(
            db, current_user.id, preferences, active_tokens
        )
        
        if success:
            logger.info(f"Updated notification preferences for user {current_user.id}")
            return {"message": "Notification preferences updated successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update notification preferences"
            )
    except Exception as e:
        logger.error(f"Failed to update notification preferences for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notification preferences: {str(e)}"
        )