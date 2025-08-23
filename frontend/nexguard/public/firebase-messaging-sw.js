// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')
importScripts('/firebase-config-sw.js')

// Initialize Firebase in service worker
firebase.initializeApp(self.FIREBASE_CONFIG)

// Retrieve Firebase Messaging object
const messaging = firebase.messaging()

// Listen for background messages from the firebase server
messaging.onBackgroundMessage(async function(payload) {
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'NexGuard Alert'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/NexGuardShield.png',
    badge: '/NexGuardShield.png',
    tag: 'nexguard-notification',
    renotify: true,
    requireInteraction: true,
    data: payload.data || {},
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ]
  }
 //Display push notification
  await self.registration.showNotification(notificationTitle, notificationOptions)
})


// Handle notification click events
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || "/";

    event.waitUntil( 
        clients.matchAll({ type: "window", includeUncontrolled: true }) /* Get all open browser tabs controlled by this service worker */
        .then((clientList) => {
            // Loop through each open tab/window
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && "focus" in client) {
                    return client.focus(); // If a matching tab exists, bring it to the front
                }
            }
            // If no matching tab is found, open a new one
            return clients.openWindow(targetUrl);
        })
    );
});
