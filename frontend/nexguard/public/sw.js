// Service Worker for NexGuard PWA
// This handles caching and offline functionality

const CACHE_NAME = 'nexguard-v1';
const RUNTIME_CACHE = 'nexguard-runtime-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/live',
  '/detections',
  '/settings',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== CACHE_NAME && name !== RUNTIME_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and browser requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip API calls - always fetch from network
  if (url.pathname.startsWith('/api/') || url.host !== self.location.host) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Network error, please check your connection' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Network first, falling back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', request.url);
              return cachedResponse;
            }
            
            // If no cache, return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/')
                .then((response) => response || new Response('Offline'));
            }
            
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle push notifications (integrates with Firebase messaging)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  if (!event.data) {
    console.log('[SW] Push event but no data');
    return;
  }

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch {
    notificationData = {
      title: 'NexGuard Alert',
      body: event.data.text()
    };
  }

  const title = notificationData.notification?.title || notificationData.title || 'NexGuard';
  const options = {
    body: notificationData.notification?.body || notificationData.body || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: 'nexguard-notification',
    requireInteraction: false,
    data: notificationData.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/detections';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle background sync (for offline actions)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-detections') {
    event.waitUntil(
      // Implement your sync logic here
      Promise.resolve()
    );
  }
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE)
        .then((cache) => {
          return cache.addAll(event.data.payload);
        })
    );
  }
});

console.log('[SW] Service worker loaded');
