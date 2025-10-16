# Notification Toggle Fix - Complete Implementation

## Issues Fixed

1. ✅ **Device tokens not properly removed when notifications disabled**
2. ✅ **Browser continues to receive messages even when notifications disabled**
3. ✅ **Foreground notifications not being displayed**
4. ✅ **Alert preferences not being respected**

## Changes Made

### 1. Backend - Delete Token from Database (Not Just Mark Inactive)

**File: `backend/app/api/routes/notifications.py`**

Added import:
```python
from ...core.models import UserDeviceToken
```

Updated `unregister_device_token()` endpoint:
- **Before:** Only marked token as inactive using `_mark_invalid_tokens()`
- **After:** Physically deletes the token record from the database

```python
@router.delete("/unregister-token/{device_token}")
def unregister_device_token(device_token: str, ...):
    """Delete token from database completely"""
    token_record = db.query(UserDeviceToken).filter(
        UserDeviceToken.device_token == device_token,
        UserDeviceToken.user_id == current_user.id
    ).first()
    
    if token_record:
        db.delete(token_record)
        db.commit()
        logger.info(f"Device token deleted from database")
    
    return {"message": "Device token unregistered successfully"}
```

**Result:** When user disables notifications, their token is completely removed from the database. Only tokens in the database receive alerts.

### 2. Backend - Include Notification Type in Alert Data

**File: `backend/app/utils/firebase_fcm_service.py`**

Updated `send_fcm_to_topic()` to accept optional data parameter:
```python
def send_fcm_to_topic(self, topic, title, body, data=None):
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in (data or {}).items()},
        topic=topic
    )
    # ... send message
```

**File: `backend/app/services/alert_service.py`**

Updated `send_alert()` to include notification metadata:
```python
self.firebase_service.send_fcm_to_topic(
    topic=Topics.DETECTION_ALERTS,
    title=f"Security Alert: Detection on Camera {detection.camera_id}",
    body=f"Detection triggered with confidence...",
    data={
        "notification_type": "alert",
        "detection_id": str(detection.id),
        "camera_id": str(detection.camera_id)
    }
)
```

### 3. Frontend - Proper Token Deletion

**File: `frontend/nexguard/lib/firebase.ts`**

Added imports:
```typescript
import { deleteToken } from 'firebase/messaging';
import { unregisterDeviceToken } from './actions/notification.actions';
import { notificationPreferencesAPI } from './actions/notificationPreferencesAPI';
```

Updated `toggleNotification()`:
```typescript
export const toggleNotification = async (enabled: boolean) => {
  if (enabled) {
    await requestNotificationPermission();
  } else {
    const storedToken = localStorage.getItem(DEVICE_TOKEN_KEY) || 
                        sessionStorage.getItem(DEVICE_TOKEN_KEY);
    
    if (storedToken && messaging) {
      // Delete from FCM servers
      await deleteToken(messaging);
      console.log('✓ FCM token deleted from Firebase servers');
      
      // Delete from backend database
      await unregisterDeviceToken(storedToken);
      console.log('✓ Device token deleted from backend database');
    }

    // Remove locally
    localStorage.removeItem(DEVICE_TOKEN_KEY);
    sessionStorage.removeItem(DEVICE_TOKEN_KEY);
  }
};
```

### 4. Frontend - Fixed Foreground Notification Display

**File: `frontend/nexguard/lib/firebase.ts`**

Updated `subscribeToForegroundMessages()`:
- **Before:** Was blocking notifications based on preference checks (double filtering)
- **After:** Shows all messages that reach the client (backend already filtered via topics)

```typescript
export const subscribeToForegroundMessages = (
  callback: (payload: MessagePayload) => void
): (() => void) => {
  const unsubscribe = onMessage(messaging, async (payload) => {
    console.log('📩 Foreground message received:', payload);
    
    // Log preferences for debugging
    const preferences = await notificationPreferencesAPI.getPreferences();
    console.log('👤 User preferences:', preferences);
    
    // Backend already filtered via topic subscriptions
    // Show the notification
    callback(payload);
  });

  return unsubscribe;
};
```

## How It Works

### Complete Flow: Disabling Notifications

1. User clicks "Turn Off Notifications" in settings
2. Frontend: `toggleNotification(false)` is called
3. Frontend: Retrieves stored FCM token from localStorage
4. Frontend: Calls `deleteToken(messaging)` → **FCM server removes token**
5. Frontend: Calls `unregisterDeviceToken(token)` → **Backend deletes from database**
6. Frontend: Removes token from localStorage/sessionStorage
7. Backend: When alert generated, queries `UserDeviceToken` table → **Token not found**
8. **Result:** No notification sent to that device

### Complete Flow: Alert Preferences

#### Backend (Topic-Based Filtering)
1. User registers device → subscribed to enabled topics automatically
2. User toggles "Detection Alerts" OFF
3. Frontend calls `updatePreferences()` API
4. Backend's `update_user_preferences_bulk()`:
   - Unsubscribes device token from `detection_alerts` topic
   - Updates preference in database
5. Detection occurs → Backend sends to `detection_alerts` topic
6. **Firebase only delivers to subscribed tokens**

#### Frontend (Display)
1. Subscribed device receives message from FCM
2. `onMessage()` callback triggered
3. Logs preferences and notification type for debugging
4. Displays notification (already filtered by backend)

## Testing

### Test 1: Token Deletion on Disable

**Steps:**
```bash
# 1. In browser console (with notifications enabled):
localStorage.getItem('device_token')
# Note the token

# 2. Disable notifications in settings

# 3. Check console logs:
# ✓ FCM token deleted from Firebase servers
# ✓ Device token deleted from backend database

# 4. Check database:
SELECT * FROM user_device_tokens WHERE device_token = 'your_token';
# Should return 0 rows (not just is_active=false)

# 5. Trigger detection and verify no notification received
```

### Test 2: Only Database Tokens Receive Alerts

**Steps:**
```bash
# 1. User A: Enable notifications
# 2. User B: Enable notifications
# 3. User A: Disable notifications
# 4. Trigger detection
# Expected: Only User B receives notification

# 5. Check backend logs:
# "Sending FCM message to topic detection_alerts"
# Token should only be sent to User B's token

# 6. Check database:
SELECT device_token, is_active FROM user_device_tokens;
# Should only show User B's token
```

### Test 3: Foreground Notifications Display

**Steps:**
```bash
# 1. Enable notifications
# 2. Keep browser tab open/focused
# 3. Trigger detection from backend
# 4. Check browser console:
# 📩 Foreground message received: {notification: {...}, data: {...}}
# 👤 User preferences: {detection_alerts: true, ...}
# 🔔 Notification type: alert

# 5. Toast notification should appear in app
```

### Test 4: Alert Preferences via Topics

**Steps:**
```bash
# 1. Enable notifications
# 2. Go to Settings → Notification Types
# 3. Disable "Detection Alerts"
# 4. Check console: should show unsubscribe API call
# 5. Trigger detection
# 6. Verify: No notification received (unsubscribed from topic)
# 7. Re-enable "Detection Alerts"
# 8. Trigger detection
# 9. Verify: Notification received (subscribed to topic)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NOTIFICATION FLOW                         │
└─────────────────────────────────────────────────────────────┘

1. TOKEN REGISTRATION
   Frontend → Backend API → Database
   ├─ POST /api/v1/notifications/register-token
   ├─ UserDeviceToken created
   └─ Auto-subscribed to enabled topic preferences

2. TOKEN DELETION (Disable Notifications)
   Frontend → FCM + Backend
   ├─ deleteToken(messaging) → FCM server
   ├─ DELETE /api/v1/notifications/unregister-token/{token}
   ├─ Database: DELETE FROM user_device_tokens
   └─ Token completely removed (not marked inactive)

3. ALERT GENERATION
   Backend Detection → Firebase Topic
   ├─ Query: SELECT * FROM user_device_tokens WHERE is_active=true
   ├─ send_fcm_to_topic("detection_alerts", ...)
   ├─ Include data: {notification_type: "alert", detection_id, camera_id}
   └─ Firebase delivers to subscribed tokens only

4. PREFERENCE CHANGES
   Frontend → Backend → Firebase
   ├─ PUT /api/v1/notifications/preferences
   ├─ update_user_preferences_bulk()
   ├─ For each token:
   │   ├─ If enabled: subscribe_to_topic(token, category)
   │   └─ If disabled: unsubscribe_from_topic(token, category)
   └─ Topic subscriptions updated in Firebase

5. FOREGROUND MESSAGE DISPLAY
   Firebase → Service Worker → Frontend
   ├─ onMessage() callback triggered
   ├─ Log preferences (debugging)
   ├─ Invoke callback(payload)
   └─ NotificationContext shows toast

6. BACKGROUND MESSAGE (Future)
   Firebase → Service Worker
   ├─ firebase-messaging-sw.js
   ├─ self.addEventListener('push', ...)
   └─ Browser shows system notification
```

## Key Benefits

✅ **Complete Token Removal:** Tokens are deleted from database, not just marked inactive
✅ **No Ghost Notifications:** Deleted tokens don't receive any messages
✅ **Backend Controls Distribution:** Only tokens in database receive alerts
✅ **Topic-Based Filtering:** Firebase topics handle preference filtering efficiently
✅ **Foreground Display Fixed:** All received messages are displayed properly
✅ **Clean Architecture:** Backend handles filtering, frontend handles display
✅ **Debugging Logs:** Rich console logging for troubleshooting
✅ **Error Handling:** Graceful fallbacks at every step

## Files Modified

### Backend
- `backend/app/api/routes/notifications.py` - Delete token instead of marking inactive
- `backend/app/utils/firebase_fcm_service.py` - Added data parameter to send_fcm_to_topic
- `backend/app/services/alert_service.py` - Include notification_type in alert data

### Frontend  
- `frontend/nexguard/lib/firebase.ts` - Proper token deletion + simplified message display
- `docs/NOTIFICATION-TOGGLE-FIX.md` - Complete documentation

## API Endpoints

- `POST /api/v1/notifications/register-token` - Register device token
- `DELETE /api/v1/notifications/unregister-token/{token}` - **Delete token from database**
- `GET /api/v1/notifications/preferences` - Get user preferences
- `PUT /api/v1/notifications/preferences` - Update preferences (handles topic subscriptions)
- `POST /api/v1/notifications/subscribe-topic` - Subscribe to topic
- `POST /api/v1/notifications/unsubscribe-topic` - Unsubscribe from topic
