import logging
import firebase_admin
from firebase_admin import credentials, messaging

logger = logging.getLogger(__name__)

class Firebase_FCM_Service:
    def __init__(self, service_account_path: str):
        """Initialize Firebase Admin SDK"""
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
            raise

    def send_fcm_message(self, token, title, body):
        print(f"Sending FCM message to token {token}")
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body
            ),
            token=token
        )
        try:
            response = messaging.send(message)
            print(f"Successfully sent FCM message: {response}")
        except Exception as e:
            print(f"Failed to send FCM message: {e}")
            raise Exception(f"Failed to send FCM message: {e}")
        return response
    
    def send_multicast_notification(self, tokens, title, body, data=None):
        """Send notification to multiple tokens and return failed tokens."""
        if not tokens:
            logger.warning("No tokens provided for multicast notification")
            return []

        logger.info(f"Sending multicast notification to {len(tokens)} tokens")

        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            tokens=tokens
        )

        try:
            response = messaging.send_each_for_multicast(message)
            logger.info(
                f"Multicast sent. Success: {response.success_count}, Failure: {response.failure_count}"
            )

            # Extract failed tokens for cleanup
            failed_tokens = [
                tokens[i] for i, resp in enumerate(response.responses) if not resp.success
            ]
            for token in failed_tokens:
                logger.warning(f"Failed to send to token {token}")

            return failed_tokens
        except Exception as e:
            logger.error(f"Error sending multicast notification: {e}")
            raise Exception(f"Failed to send multicast notification: {e}")


    def send_fcm_to_topic(self, topic, title, body):
        print(f"Sending FCM message to topic {topic}")
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body
            ),
            topic=topic
        )
        try:
            response = messaging.send(message)
            print(f"Successfully sent message to topic {topic}: {response}")
            logger.info(f"Successfully sent message to topic {topic}: {response}")
        except Exception as e:
            logger.error(f"Failed to send message to topic {topic}: {e}")
            print(f"Failed to send message to topic {topic}: {e}")
            raise Exception(f"Failed to send FCM message to topic {topic}: {e}")
        return response
    
    def subscribe_to_topic(self, token, topic):
        try:
            print(f"Subscribing token {token} to topic {topic}")
            response = messaging.subscribe_to_topic(token, topic)
            logger.info(f"Successfully subscribed {token} to topic {topic}: {response}")
        except Exception as e:
            logger.error(f"Failed to subscribe {token} to topic {topic}: {e}")
            raise Exception(f"Failed to subscribe to topic {topic}: {e}")
        return response

    def unsubscribe_from_topic(self, token, topic):
        try:
            response = messaging.unsubscribe_from_topic(token, topic)
            logger.info(f"Successfully unsubscribed {token} from topic {topic}: {response}")
        except Exception as e:
            logger.error(f"Failed to unsubscribe {token} from topic {topic}: {e}")
            raise Exception(f"Failed to unsubscribe from topic {topic}: {e}")
        return response
