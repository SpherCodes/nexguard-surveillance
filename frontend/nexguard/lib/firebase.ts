import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  MessagePayload,
  onMessage,
  Messaging
} from 'firebase/messaging';
import { registerDeviceToken } from './actions/notification.actions';

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
if(typeof window !== "undefined" && "navigator" in window){
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
    const currentToken = await getToken(messaging, { vapidKey });

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
      // Note: browsers don't allow programmatic revoking of permission.
      console.info(
        'To fully disable notifications, user must revoke permission in browser settings.'
      );
      // remove stored token locally
      try {
        localStorage.removeItem(DEVICE_TOKEN_KEY);
      } catch {}
      try {
        sessionStorage.removeItem(DEVICE_TOKEN_KEY);
      } catch {}
    }
  } catch (error) {
    console.error('Error toggling notification:', error);
  }
};

/**
 * onMessageListener returns a Promise that resolves with the next foreground payload.
 * Also accepts an optional callback that will be invoked for every payload.
 */
export const onMessageListener = (
  callback?: (payload: MessagePayload) => void
) =>
  new Promise<MessagePayload | null>((resolve) => {
    if (!messaging) {
      resolve(null);
      return;
    }

    try {
      onMessage(messaging, (payload) => {
        console.log('Message received: ', payload);
        if (callback) callback(payload);
        resolve(payload);
      });
    } catch (err) {
      console.warn('onMessage failed:', err);
      resolve(null);
    }
  });

export { messaging };
