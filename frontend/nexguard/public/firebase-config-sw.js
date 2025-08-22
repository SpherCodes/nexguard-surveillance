self.FIREBASE_CONFIG = {
  apiKey: "${NEXT_PUBLIC_FIREBASE_API_KEY}",
  authDomain: "${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",
  projectId: "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
  storageBucket: "${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${NEXT_PUBLIC_FIREBASE_APP_ID}",
  measurementId: "${NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}"
};

if (self.FIREBASE_CONFIG.apiKey?.startsWith && self.FIREBASE_CONFIG.apiKey.startsWith("${")) {
  self.FIREBASE_CONFIG = {
    apiKey: "AIzaSyD_6CPWidr1b95TaVXjbGri2wB-eAvncq8",
    authDomain: "nexguard-38862.firebaseapp.com",
    projectId: "nexguard-38862",
    storageBucket: "nexguard-38862.firebasestorage.app",
    messagingSenderId: "914195889526",
    appId: "1:914195889526:web:dd3a38bbc0d66c6fcfce57",
    measurementId: "G-M8KH2X8VD4"
  };
}
