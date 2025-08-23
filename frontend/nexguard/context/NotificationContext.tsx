'use client';

import React, { createContext, useEffect, useState, ReactNode } from 'react';
import {
  requestNotificationPermission,
  registerDeviceToken,
  unregisterDeviceToken,
  subscribeToTopicLocal,
  unsubscribeFromTopic,
} from '@/lib/actions/notification.actions';
import { onMessageListener } from '@/lib/firebase';
import { toast } from 'sonner';

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

  const isSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

  // Request permission and fetch token
  const refreshToken = async () => {
    try {
      const t = await requestNotificationPermission();
      if (t) {
        await registerDeviceToken(t);
        setToken(t);
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
    if (localToken) setToken(localToken);

    setPermission(Notification.permission);

    // Listen for foreground messages
    onMessageListener()
      .then((payload: any) => {
        if (payload.notification) {
          toast(payload.notification.title || 'New Notification', {
            description: payload.notification.body,
          });
        }
      })
      .catch((err) => console.error('Error listening for messages', err));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        currentDeviceToken,
        notificationPermission,
        isSupported,
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
