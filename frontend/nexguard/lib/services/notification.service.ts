'use client';

import { toast as sonnerToast } from 'sonner';
import {
  CustomToast,
  type ToastType
} from '@/components/ui/notifications/CustomToast';
import { createElement } from 'react';

interface NotificationOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  isDismissible?: boolean;
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-center'
    | 'bottom-center';
}

class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private showNotification(
    type: ToastType,
    title: string,
    options: NotificationOptions = {}
  ) {
    const {
      description,
      duration = 5000,
      action,
      onClose,
      isDismissible = true,
      position = 'top-right'
    } = options;

    const toastId = sonnerToast.custom(
      (id) =>
        createElement(CustomToast, {
          type,
          title,
          description,
          action,
          timestamp: new Date(),
          isDismissible,
          onClose: () => {
            sonnerToast.dismiss(id);
            onClose?.();
          }
        }),
      {
        duration,
        position
      }
    );

    return toastId;
  }

  success(title: string, options?: NotificationOptions) {
    return this.showNotification('success', title, options);
  }

  error(title: string, options?: NotificationOptions) {
    return this.showNotification('error', title, options);
  }

  warning(title: string, options?: NotificationOptions) {
    return this.showNotification('warning', title, options);
  }

  info(title: string, options?: NotificationOptions) {
    return this.showNotification('info', title, options);
  }

  detection(title: string, options?: NotificationOptions) {
    return this.showNotification('detection', title, options);
  }

  security(title: string, options?: NotificationOptions) {
    return this.showNotification('security', title, options);
  }

  system(title: string, options?: NotificationOptions) {
    return this.showNotification('system', title, options);
  }

  // Specialized notifications for common use cases
  cameraOffline(
    cameraName: string,
    options?: Omit<NotificationOptions, 'action'>
  ) {
    return this.warning(`Camera Offline: ${cameraName}`, {
      ...options,
      description: 'This camera is currently offline and not recording.',
      action: {
        label: 'View Cameras',
        onClick: () => {
          // Navigate to cameras page
          window.location.href = '/cameras';
        }
      }
    });
  }

  detectionAlert(
    cameraName: string,
    objectType: string,
    confidence: number,
    options?: Omit<NotificationOptions, 'action'>
  ) {
    return this.detection(`${objectType} Detected`, {
      ...options,
      description: `${objectType} detected on ${cameraName} (${Math.round(confidence * 100)}% confidence)`,
      duration: 10000,
      action: {
        label: 'View Alert',
        onClick: () => {
          window.location.href = '/alerts';
        }
      }
    });
  }

  systemMaintenance(
    message: string,
    options?: Omit<NotificationOptions, 'action'>
  ) {
    return this.system('System Maintenance', {
      ...options,
      description: message,
      duration: 10000,
      action: {
        label: 'Learn More',
        onClick: () => {
          // Navigate to system status page or show more details
          window.location.href = '/system/status';
        }
      }
    });
  }

  settingsUpdated(settingType: string, options?: NotificationOptions) {
    return this.success(`${settingType} Updated`, {
      ...options,
      description: 'Your settings have been saved successfully.',
      duration: 3000
    });
  }

  loginSuccess(username: string, options?: NotificationOptions) {
    return this.success('Welcome Back!', {
      ...options,
      description: `Successfully signed in as ${username}`,
      duration: 3000
    });
  }

  securityAlert(
    message: string,
    options?: Omit<NotificationOptions, 'action'>
  ) {
    return this.security('Security Alert', {
      ...options,
      description: message,
      duration: 8000,
      action: {
        label: 'Review',
        onClick: () => {
          window.location.href = '/security/logs';
        }
      }
    });
  }

  cameraAction(message: string, options?: NotificationOptions) {
    return this.success(message, {
      ...options,
      duration: 4000
    });
  }

  userAction(message: string, options?: NotificationOptions) {
    return this.success(message, {
      ...options,
      duration: 4000
    });
  }

  // Batch dismiss notifications
  dismissAll() {
    sonnerToast.dismiss();
  }

  // Promise-based notifications for async operations
  async promise<T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error
    }: {
      loading: string;
      success: (data: T) => string;
      error: (error: Error) => string;
    }
  ): Promise<T> {
    const result = await sonnerToast.promise(promise, {
      loading,
      success,
      error
    });
    return result.unwrap();
  }
}

// Export singleton instance
export const notifications = NotificationService.getInstance();

// Export for backwards compatibility
export const enhancedToast = notifications;
