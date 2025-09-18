'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { webRTCManager } from '@/lib/services/webrtc_manager';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { NotificationProvider } from '@/context/NotificationContext';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Initialize WebRTC manager with QueryClient
  useEffect(() => {
    webRTCManager.setQueryClient(queryClient);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <ServiceWorkerRegistration />
  <div className="min-h-screen">{children}</div>
        <Toaster 
          position="top-right"
          richColors
          duration={5000}
          expand={true}
          visibleToasts={5}
          toastOptions={{
            classNames: {
              toast: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl',
              description: 'group-[.toast]:text-gray-600',
              actionButton: 'group-[.toast]:bg-gray-900 group-[.toast]:text-white group-[.toast]:rounded-lg',
              cancelButton: 'group-[.toast]:bg-gray-100 group-[.toast]:text-gray-600 group-[.toast]:rounded-lg',
              closeButton: 'group-[.toast]:border-gray-200 group-[.toast]:bg-white group-[.toast]:text-gray-600 group-[.toast]:hover:bg-gray-50',
            },
            style: {
              background: 'white',
              border: '1px solid rgb(229, 231, 235)',
              color: 'rgb(55, 65, 81)',
            },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </NotificationProvider>
    </QueryClientProvider>
  );
}
