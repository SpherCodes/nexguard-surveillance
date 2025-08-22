import { requestForToken } from "../firebase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Shared authFetch function (should be moved to a separate utility file)
const authFetch = async (url: string, options: RequestInit = {}) => {
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }

    throw new Error(errorMessage);
  }

  return response;
};


export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await requestForToken();
      return token;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
  return null;
};
// Register device token with backend
export const registerDeviceToken = async (token: string) => {
  try {
    const response = await authFetch(
      `${API_BASE_URL}/api/v1/notifications/register-token`,
      {
        method: 'POST',
        body: JSON.stringify({
          device_token: token,
          device_type: 'web',
          device_name: navigator.userAgent
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to register device token');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error registering device token:', error);
    throw error;
  }
};

//Fetch device tokens(all tokens related to that user)
export const fetchTokens = async () => {
  try {
    const response = await authFetch(
      `${API_BASE_URL}/api/v1/notifications/tokens`
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching device tokens:', error);
    throw error;
  }
};

export async function unregisterDeviceToken(
  deviceToken: string
): Promise<void> {
  if (!deviceToken) {
    throw new Error('No device token provided');
  }

  await authFetch(
    `${API_BASE_URL}/api/v1/notifications/unregister-token/${encodeURIComponent(deviceToken)}`,
    {
      method: 'DELETE'
    }
  );
  return;
}


export const ToggleNotificationsForDevice = async (deviceToken?: string | null) => {
  if (deviceToken) {
    localStorage.removeItem('device_token');
    await unregisterDeviceToken(deviceToken);
  }
  else{
    const token = await requestNotificationPermission();
    if(token){
      await registerDeviceToken(token);
    }
  }
};
export const subscribeToTopicLocal = async (topic: string, token: string) => {
  try {
    if (!token) {
      throw new Error('No token available');
    }
    const response = await authFetch(
      `${API_BASE_URL}/api/v1/notifications/subscribe-topic`,
      {
        method: 'POST',
        body: JSON.stringify({
          device_token: token,
          topic: topic
        })
      }
    );

    const result = await response.json();
    console.log(`Successfully subscribed to topic ${topic}:`, result);
    return result;
  } catch (error) {
    console.error(`Error subscribing to topic ${topic}:`, error);
    return false;
  }
};

export const unsubscribeFromTopic = async (topic: string, token: string) => {
  try {
    if (!token) {
      throw new Error('No token available');
    }
    const response = await authFetch(
      `${API_BASE_URL}/api/v1/notifications/unsubscribe-topic`,
      {
        method: 'POST',
        body: JSON.stringify({
          device_token: token,
          topic: topic
        })
      }
    );

    const result = await response.json();
    console.log(`Successfully unsubscribed from topic ${topic}:`, result);
    return result;
  } catch (error) {
    console.error(`Error unsubscribing from topic ${topic}:`, error);
    return false;
  }
};

export const fetchNotificationPreferences = async () => {
  try {
    const response = await authFetch(
      `${API_BASE_URL}/api/v1/notifications/preferences`
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    throw error;
  }
};
