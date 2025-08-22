import { authFetch, API_BASE_URL } from './auth';

export interface NotificationPreferences {
  push_notifications: boolean;
  detection_alerts: boolean;
  system_announcements: boolean;
  account_updates: boolean;
}

class NotificationPreferencesAPI {
  private baseUrl = `${API_BASE_URL}/api/v1/notifications`;

  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const response = await authFetch(`${this.baseUrl}/preferences`);
      if (!response.ok) {
        throw new Error(`Failed to fetch preferences: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      // Return default preferences on error
      return {
        push_notifications: true,
        detection_alerts: true,
        system_announcements: true,
        account_updates: true
      };
    }
  }

  async updatePreferences(
    preferences: NotificationPreferences
  ): Promise<boolean> {
    try {
      const response = await authFetch(`${this.baseUrl}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Failed to update preferences: ${response.status}`
        );
      }

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  async subscribeToTopic(deviceToken: string, topic: string): Promise<boolean> {
    try {
      const response = await authFetch(`${this.baseUrl}/subscribe-topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_token: deviceToken,
          topic: topic
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Failed to subscribe to topic: ${response.status}`
        );
      }

      return true;
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
      throw error;
    }
  }

  async unsubscribeFromTopic(
    deviceToken: string,
    topic: string
  ): Promise<boolean> {
    try {
      const response = await authFetch(`${this.baseUrl}/unsubscribe-topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_token: deviceToken,
          topic: topic
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail ||
            `Failed to unsubscribe from topic: ${response.status}`
        );
      }

      return true;
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
      throw error;
    }
  }
}

export const notificationPreferencesAPI = new NotificationPreferencesAPI();
