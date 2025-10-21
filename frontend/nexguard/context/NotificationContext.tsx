'use client';

import React, { createContext, useEffect, useState, ReactNode } from 'react';
import {
  requestNotificationPermission,
  registerDeviceToken,
  unregisterDeviceToken,
  subscribeToTopicLocal,
  unsubscribeFromTopic,
} from '@/lib/actions/notification.actions';
import { subscribeToForegroundMessages } from '@/lib/firebase';
import { notifications } from '@/lib/services/notification.service';
import { useQueryClient } from '@tanstack/react-query';

interface NotificationContextType {
  currentDeviceToken: string | null;
  notificationPermission: NotificationPermission;
  tokens: string[];
  refreshToken: () => Promise<void>;
  toggleNotifications: () => Promise<void>;
  subscribeToTopic: (topic: string) => Promise<void>;
  unsubscribeFromTopic: (topic: string) => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentDeviceToken, setToken] = useState<string | null>(null);
  const [notificationPermission, setPermission] = useState<NotificationPermission>('default');
  const [tokens, setTokens] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Request permission and fetch token
  const refreshToken = async () => {
    try {
      const t = await requestNotificationPermission();
      if (t) {
        await registerDeviceToken(t);
        setToken(t);
        // keep a simple in-memory list of tokens for the context
        setTokens((prev) => Array.from(new Set([...prev, t])));
        localStorage.setItem('device_token', t);
        setPermission('granted');
      } else {
        setPermission('denied');
      }
    } catch (err) {
      console.error('Error refreshing token', err);
      setPermission('denied');
    }
  };

  const toggleNotifications = async () => {
    if (currentDeviceToken) {
      await unregisterDeviceToken(currentDeviceToken);
      localStorage.removeItem('device_token');
      setTokens((prev) => prev.filter((tok) => tok !== currentDeviceToken));
      setToken(null);
      setPermission('denied');
    } else {
      await refreshToken();
    }
  };

  const subscribeToTopic = async (topic: string) => {
    if (!currentDeviceToken) return;
    await subscribeToTopicLocal(topic, currentDeviceToken);
  };

  const unsubscribeFromTopicFunc = async (topic: string) => {
    if (!currentDeviceToken) return;
    await unsubscribeFromTopic(topic, currentDeviceToken);
  };

  useEffect(() => {
    // Load existing token from localStorage
    const localToken = localStorage.getItem('device_token');
    if (localToken) {
      setToken(localToken);
      setTokens([localToken]);
    }

    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);

      if (Notification.permission === 'granted') {
        refreshToken().catch((err) => {
          console.error('Failed to refresh FCM token on mount', err);
        });
      }
    }

    // Listen for foreground messages
    const unsubscribe = subscribeToForegroundMessages((payload) => {
      if (payload?.notification) {
        const title = payload.notification.title || 'New Notification';
        const description = payload.notification.body;

        notifications.detection(title, { description });
      }

      void queryClient.invalidateQueries({ queryKey: ['detectionEvents'] });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return (
    <NotificationContext.Provider
      value={{
        currentDeviceToken,
        notificationPermission,
        tokens,
        refreshToken,
        toggleNotifications,
        subscribeToTopic,
        unsubscribeFromTopic: unsubscribeFromTopicFunc,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
