'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    setIsOnline(navigator.onLine);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (isOnline) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <WifiOff className="w-10 h-10 text-gray-600 dark:text-gray-400" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              You&apos;re Offline
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              It looks like you&apos;ve lost your internet connection. Some features may be limited until you&apos;re back online.
            </p>
          </div>

          {/* Retry Button */}
          <Button
            onClick={handleRetry}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>

          {/* Tips */}
          <div className="text-left space-y-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              While offline, you can:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>View previously loaded pages</li>
              <li>Access cached content</li>
              <li>Review saved detections</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
