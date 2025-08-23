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
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #e5e7eb',
              color: '#374151',
            },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </NotificationProvider>
    </QueryClientProvider>
  );
}
