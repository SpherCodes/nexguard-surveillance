import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  MessagePayload,
  onMessage,
  Messaging,
  deleteToken
} from 'firebase/messaging';
import {
  registerDeviceToken,
  unregisterDeviceToken
} from './actions/notification.actions';
import { notificationPreferencesAPI } from './actions/notificationPreferencesAPI';

export const DEVICE_TOKEN_KEY = 'device_token';
export const DEVICE_TOKEN_EVENT = 'nexguard:device-token';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let messaging: Messaging | undefined;
if (typeof window !== 'undefined' && 'navigator' in window) {
  const app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
}

/**
 * Request FCM registration token, persist it, notify listeners and register with backend.
 * Returns token string or null.
 */
export const requestForToken = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn('Firebase messaging unavailable in this environment.');
    return null;
  }

  try {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY as
      | string
      | undefined;

    if (!vapidKey) {
      console.error(
        'VAPID key is not configured. Please add NEXT_PUBLIC_FIREBASE_VAPID_KEY to your environment variables.'
      );
      return null;
    }

    let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // First, try to find existing Firebase messaging SW
      const allRegistrations = await navigator.serviceWorker.getRegistrations();
      console.log(
        'All SW registrations:',
        allRegistrations.map((r) => ({
          scope: r.scope,
          scriptURL: r.active?.scriptURL
        }))
      );

      serviceWorkerRegistration = allRegistrations.find((reg) =>
        reg.active?.scriptURL.includes('firebase-messaging-sw.js')
      );

      // If not found, register it explicitly
      if (!serviceWorkerRegistration) {
        console.log('Registering Firebase messaging service worker...');
        try {
          serviceWorkerRegistration = await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js',
            { scope: '/firebase-cloud-messaging-push-scope' }
          );
          console.log('Firebase messaging SW registered successfully');

          // Wait for it to activate
          await navigator.serviceWorker.ready;
        } catch (error) {
          console.error('Failed to register Firebase messaging SW:', error);
          return null;
        }
      } else {
        console.log('Found existing Firebase messaging SW:', {
          scope: serviceWorkerRegistration.scope,
          scriptURL: serviceWorkerRegistration.active?.scriptURL
        });
      }
    }

    if (!serviceWorkerRegistration) {
      console.error('Failed to get service worker registration');
      return null;
    }

    console.log('Using SW:', serviceWorkerRegistration.scope);

    const getTokenOptions = {
      vapidKey,
      serviceWorkerRegistration
    };

    const currentToken = await getToken(messaging, getTokenOptions);

    if (currentToken) {
      try {
        localStorage.setItem(DEVICE_TOKEN_KEY, currentToken);
      } catch {
        console.warn('Failed to store device token in localStorage');
      }
      try {
        window.dispatchEvent(
          new CustomEvent(DEVICE_TOKEN_EVENT, { detail: currentToken })
        );
      } catch {
        console.warn('Failed to dispatch device token event');
      }

      try {
        await registerDeviceToken(currentToken);
        console.info('Device token registered with backend');
      } catch (e) {
        console.warn('Failed to register device token with backend', e);
      }

      return currentToken;
    } else {
      console.warn(
        'No registration token available. Request permission first.'
      );
      return null;
    }
  } catch (err: unknown) {
    console.error('An error occurred while retrieving token.', err);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<
  string | null
> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported in this environment.');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission not granted.');
    return null;
  }

  return requestForToken();
};

export const toggleNotification = async (enabled: boolean) => {
  try {
    if (enabled) {
      await requestNotificationPermission();
    } else {
      // Get the stored token before removing it
      const storedToken =
        localStorage.getItem(DEVICE_TOKEN_KEY) ||
        sessionStorage.getItem(DEVICE_TOKEN_KEY);

      if (storedToken && messaging) {
        // Delete token from Firebase Cloud Messaging
        try {
          await deleteToken(messaging);
          console.log('✓ FCM token deleted from Firebase servers');
        } catch (error) {
          console.error('Error deleting FCM token:', error);
        }

        // Unregister token from backend
        try {
          await unregisterDeviceToken(storedToken);
          console.log('✓ Device token unregistered from backend');
        } catch (error) {
          console.error('Error unregistering token from backend:', error);
        }
      }

      // Remove stored token locally
      try {
        localStorage.removeItem(DEVICE_TOKEN_KEY);
      } catch {}
      try {
        sessionStorage.removeItem(DEVICE_TOKEN_KEY);
      } catch {}

      // Note: browsers don't allow programmatic revoking of permission.
      console.info(
        'To fully disable notifications, user must revoke permission in browser settings.'
      );
    }
  } catch (error) {
    console.error('Error toggling notification:', error);
  }
};

/**
 * Subscribe to foreground FCM messages.
 * Returns an unsubscribe function for cleanup.
 *
 * Note: The backend handles preference filtering via topic subscriptions.
 * This function logs preference status for debugging but shows all messages
 * that reach the client (since they've already passed backend filtering).
 */
export const subscribeToForegroundMessages = (
  callback: (payload: MessagePayload) => void
): (() => void) => {
  if (!messaging) {
    console.warn('Firebase messaging unavailable for foreground listener.');
    return () => undefined;
  }

  try {
    const unsubscribe = onMessage(messaging, async (payload) => {
      console.log('📩 Foreground message received:', payload);

      // Log user preferences for debugging (backend already filtered via topics)
      try {
        const preferences = await notificationPreferencesAPI.getPreferences();
        console.log('👤 User preferences:', preferences);

        const notificationType =
          payload.data?.notification_type || payload.data?.type;
        console.log('🔔 Notification type:', notificationType);

        // Backend already handles filtering via topic subscriptions
        // If message reached here, user is subscribed to the topic
        // Show the notification
        callback(payload);
      } catch (error) {
        console.error(
          'Error fetching preferences (showing notification anyway):',
          error
        );
        // On error, still show the notification
        callback(payload);
      }
    });

    return () => {
      try {
        unsubscribe();
      } catch (err) {
        console.warn('Failed to unsubscribe from foreground messages', err);
      }
    };
  } catch (err) {
    console.warn('Failed to subscribe to foreground messages', err);
    return () => undefined;
  }
};

export { messaging };
