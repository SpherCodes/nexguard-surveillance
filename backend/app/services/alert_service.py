import datetime
from datetime import timezone
import json
from typing import Any, Dict, List, Optional
import logging
from firebase_admin import messaging
from enum import Enum
from sqlalchemy.orm import Session

from ..schema.notification import NotificationPreferenceResponse, NotificationPreferenceUpdate

from ..utils.database_crud import CRUDBase

logger = logging.getLogger("nexguard.notifications")

from ..core.models import Detection, NotificationLog, NotificationPreference, UserDeviceToken

class NotificationType(str, Enum):
    ACCOUNT_APPROVED = "account_approved"
    ACCOUNT_REJECTED = "account_rejected"
    PASSWORD_RESET = "password_reset"
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    WELCOME = "welcome"
    REMINDER = "reminder"
    ALERT = "alert"

class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"

class Topics:
    DETECTION_ALERTS = "detection_alerts"
    PUSH_NOTIFICATIONS = "push_notifications"
    SYSTEM_ANNOUNCEMENTS = "system_announcements"
    ACCOUNT_UPDATES = "account_updates"

class AlertService:
    def __init__(self, firebase_service=None):
        self.firebase_service = firebase_service
        if not self.firebase_service:
            logger.warning("Firebase FCM service is not available")

    def send_alert(self, db: Session, detection: Detection):
        if not detection:
            logger.warning("No detection data available to send alert")
            return
        try:
            print(f"Sending alert for detection {detection.id} on camera {detection.camera_id}")
            # Log the Notification in the database
            self._log_notification(
                db,
                user_id=1,
                notification_type=NotificationType.ALERT,
                title=f"Security Alert: Detection on Camera {detection.camera_id}",
                body=f"Detection triggered with confidence {detection.confidence} at {detection.created_at}.",
                data={"detection_id": detection.id}
            )

            # Query all active tokens
            user_tokens = db.query(UserDeviceToken).filter(UserDeviceToken.is_active == True).all()
            
            # Send multicast notification
            self.firebase_service.send_fcm_to_topic(
                topic=Topics.DETECTION_ALERTS,
                title=f"Security Alert: Detection on Camera {detection.camera_id}",
                body=f"Detection triggered with confidence {detection.confidence:.2%} at {detection.created_at.strftime('%Y-%m-%d %H:%M:%S %Z')}.",
            )
            print("Alert sent successfully")

        except Exception as e:
            print(f"Error sending alert: {e}")
            logger.error(f"Error sending alert: {e}")

    def register_device_token(
        self, 
        db: Session, 
        user_id: int, 
        device_token: str, 
        device_type: str,
        device_name: Optional[str] = None
    ) -> UserDeviceToken:
        """Register or update a user's device token"""
        try:
            existing_token = db.query(UserDeviceToken).filter(
                UserDeviceToken.device_token == device_token
            ).first()
            
            if existing_token:
                existing_token.user_id = user_id
                existing_token.device_type = device_type
                existing_token.device_name = device_name
                existing_token.is_active = True
                existing_token.updated_at = datetime.datetime.now(timezone.utc)
                db.commit()
                logger.info(f"Updated device token for user {user_id}")

                # Ensure the device stays subscribed to detection alerts
                if self.firebase_service:
                    try:
                        self.firebase_service.subscribe_to_topic(existing_token.device_token, Topics.DETECTION_ALERTS)
                    except Exception as e:
                        logger.warning(f"Failed to subscribe existing token to detection alerts: {e}")
                        self._mark_invalid_tokens(db, existing_token.device_token)
                        raise

                return existing_token
            
            new_token = UserDeviceToken(
                user_id=user_id,
                device_token=device_token,
                device_type=device_type,
                device_name=device_name
            )
            
            db.add(new_token)
            db.commit()
            db.refresh(new_token)
            logger.info(f"Registered new device token for user {user_id}")

            if self.firebase_service:
                try:
                    self.firebase_service.subscribe_to_topic(new_token.device_token, Topics.DETECTION_ALERTS)
                except Exception as e:
                    logger.warning(f"Failed to subscribe new token to detection alerts: {e}")
                    self._mark_invalid_tokens(db, new_token.device_token)
                    raise

            return new_token
            
        except Exception as e:
            logger.error(f"Error registering device token: {e}")
            db.rollback()
            raise

    def subscribe_to_topic(self, db: Session, device_token: str, topic: str) -> bool:
        """Subscribe a device token to a topic"""
        try:
            token_record = db.query(UserDeviceToken).filter(
                UserDeviceToken.device_token == device_token
            ).first()
            
            if not token_record:
                logger.warning(f"Cannot subscribe unknown token {device_token} to topic {topic}")
                return False

            if not token_record.is_active:
                logger.warning(f"Cannot subscribe inactive token {device_token} to topic {topic}")
                return False

            if not self.firebase_service:
                logger.warning("Firebase service unavailable, cannot subscribe to topic")
                return False

            # Subscribe the token to the topic
            self.firebase_service.subscribe_to_topic(device_token, topic)
            logger.info(f"Subscribed token {device_token} to topic {topic}")
            return True
            
        except Exception as e:
            logger.error(f"Error subscribing device token: {e}")
            return False

    def unsubscribe_from_topic(self, db: Session, device_token: str, topic: str) -> bool:
        """Unsubscribe a device token from a topic"""
        try:
            token_record = db.query(UserDeviceToken).filter(
                UserDeviceToken.device_token == device_token
            ).first()

            if not token_record:
                logger.warning(f"Cannot unsubscribe unknown token {device_token} from topic {topic}")
                return False

            if not token_record.is_active:
                logger.warning(f"Cannot unsubscribe inactive token {device_token} from topic {topic}")
                return False

            if not self.firebase_service:
                logger.warning("Firebase service unavailable, cannot unsubscribe from topic")
                return False

            # Unsubscribe the token from the topic
            self.firebase_service.unsubscribe_from_topic(device_token, topic)
            logger.info(f"Unsubscribed token {device_token} from topic {topic}")
            return True

        except Exception as e:
            logger.error(f"Error unsubscribing device token: {e}")
            return False

    def update_user_notification_preferences(self, db:Session, update: NotificationPreferenceUpdate):
        try:
            pref = db.query(NotificationPreference).filter(
                NotificationPreference.user_id == update.user_id,
                NotificationPreference.category == update.category
            ).first()
            if pref:
                #update the preference if it exists
                pref.enabled = update.enabled
                pref.updated_at = datetime.datetime.now(timezone.utc)
                if pref.enabled:
                    self.subscribe_to_topic(db, update.token, update.category)
                else:
                    # If disabling, unsubscribe from topic
                    self.unsubscribe_from_topic(db, update.token, update.category)
            else:
                pref = NotificationPreference(
                    user_id=update.user_id,
                    category=update.category,
                    enabled=update.enabled
                )
                if pref.enabled:
                    self.subscribe_to_topic(db, update.token, update.category)
                else:
                    # If disabling, unsubscribe from topic
                    self.unsubscribe_from_topic(db, update.token, update.category)
                db.add(pref)
            db.commit()
            return True

        except Exception as e:
            logger.error(f"Error updating notification preferences: {e}")
            print(f"Error updating notification preferences: {e}")
            db.rollback()
            return False

    def get_user_device_tokens(self, db: Session, user_id: int):
        """Get all device tokens for a specific user"""
        try:
            tokens = db.query(UserDeviceToken).filter(
                UserDeviceToken.user_id == user_id
            ).all()
            return tokens
        except Exception as e:
            logger.error(f"Error fetching user device tokens: {e}")
            return []

    def get_user_notification_preferences_dict(self, db: Session, user_id: int) -> dict[str, bool]:
        """Get notification preferences for a user as a dictionary"""
        try:
            # Default preferences
            default_preferences = {
                'push_notifications': False,
                'detection_alerts': False,
                'system_announcements': False,
                'account_updates': False
            }
            
            # Fetch preferences for the user
            prefs = db.query(NotificationPreference).filter(
                NotificationPreference.user_id == user_id
            ).all()

            # Update defaults with saved preferences
            for pref in prefs:
                if pref.category in default_preferences:
                    default_preferences[pref.category] = pref.enabled

            return default_preferences

        except Exception as e:
            logger.error(f"Error fetching notification preferences: {e}")
            # Return defaults on error
            return {
                'push_notifications': True,
                'detection_alerts': True,
                'system_announcements': True,
                'account_updates': True
            }

    def update_user_preferences_bulk(self, db: Session, user_id: int, preferences: dict[str, bool], device_tokens: list[str]) -> bool:
        """Update multiple notification preferences for a user"""
        try:
            for category, enabled in preferences.items():
                # Update or create preference record
                pref = db.query(NotificationPreference).filter(
                    NotificationPreference.user_id == user_id,
                    NotificationPreference.category == category
                ).first()
                
                if pref:
                    # Update existing preference
                    pref.enabled = enabled
                    pref.updated_at = datetime.datetime.now(timezone.utc)
                else:
                    # Create new preference
                    pref = NotificationPreference(
                        user_id=user_id,
                        category=category,
                        enabled=enabled
                    )
                    db.add(pref)
                
                # Handle topic subscription/unsubscription for device tokens
                if self.firebase_service and device_tokens:
                    for device_token in device_tokens:
                        if enabled:
                            # Subscribe to topic
                            self.subscribe_to_topic_internal(device_token, category)
                        else:
                            # Unsubscribe from topic
                            self.unsubscribe_from_topic_internal(device_token, category)
            
            db.commit()
            return True

        except Exception as e:
            logger.error(f"Error updating bulk notification preferences: {e}")
            db.rollback()
            return False

    def subscribe_to_topic_internal(self, device_token: str, topic: str) -> bool:
        """Internal method to subscribe a device token to a topic"""
        try:
            if self.firebase_service:
                self.firebase_service.subscribe_to_topic(device_token, topic)
                logger.info(f"Subscribed device token to topic {topic}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error subscribing to topic {topic}: {e}")
            return False

    def unsubscribe_from_topic_internal(self, device_token: str, topic: str) -> bool:
        """Internal method to unsubscribe a device token from a topic"""
        try:
            if self.firebase_service:
                self.firebase_service.unsubscribe_from_topic(device_token, topic)
                logger.info(f"Unsubscribed device token from topic {topic}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error unsubscribing from topic {topic}: {e}")
            return False
            logger.error(f"Error fetching notification preferences: {e}")
            return []

    def _mark_invalid_tokens(self, db: Session, invalid_tokens: Any):
        """Mark invalid tokens as inactive. Accepts a single token (str) or an iterable of tokens."""
        try:
            if not invalid_tokens:
                return

            if isinstance(invalid_tokens, (str, bytes)):
                tokens = [invalid_tokens]
            elif isinstance(invalid_tokens, (list, tuple, set)):
                tokens = list(invalid_tokens)
            else:
                logger.warning(f"Unexpected invalid_tokens type: {type(invalid_tokens)}")
                return

            changed = 0
            now = datetime.datetime.now(timezone.utc)
            for token in tokens:
                token_record = db.query(UserDeviceToken).filter(
                    UserDeviceToken.device_token == token
                ).first()
                if token_record and token_record.is_active:
                    token_record.is_active = False
                    if hasattr(token_record, "updated_at"):
                        token_record.updated_at = now
                    changed += 1
                    logger.info(f"Marked invalid token {token} as inactive")

            if changed:
                db.commit()

        except Exception as e:
            db.rollback()
            logger.error(f"Error marking invalid tokens: {e}")

    def cleanup_invalid_tokens_from_db(self, db: Session):
        """
        Scan the database for tokens marked as invalid (or expired) and deactivate them.
        """
        try:
            invalid_tokens = db.query(UserDeviceToken).filter(UserDeviceToken.is_active == True).all()
            removed_count = 0

            for token in invalid_tokens:
                if token.is_active == False:
                    db.delete(token)
                    removed_count += 1

            if removed_count > 0:
                db.commit()
                logger.info(f"Deleted {removed_count} invalid device tokens")
            else:
                logger.info("No invalid tokens found to delete")

        except Exception as e:
            db.rollback()
            logger.error(f"Error cleaning up invalid tokens from DB: {e}")

    def _log_notification(
        self,
        db: Session,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        firebase_message_ids: List[str] = None
    ):
        """Log notification to database"""
        try:
            notification_log = NotificationLog(
                user_id=user_id,
                notification_type=notification_type.value,
                title=title,
                body=body,
                data=json.dumps(data) if data else None,
                delivered=bool(firebase_message_ids),
                firebase_message_id=",".join(firebase_message_ids) if firebase_message_ids else None
            )
            db.add(notification_log)
            db.commit()
        except Exception as e:
            logger.error(f"Error logging notification: {e}")
