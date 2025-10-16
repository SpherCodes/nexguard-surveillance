"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      (async () => {
        try {
          // Register Firebase Messaging Service Worker
          const firebaseReg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
          if (!firebaseReg) {
            await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
              scope: "/firebase-cloud-messaging-push-scope"
            });
            console.log("✅ Firebase Service Worker registered");
          } else {
            console.log("ℹ️ Firebase Service Worker already registered");
          }

          // Register PWA Service Worker for offline functionality
          const pwaReg = await navigator.serviceWorker.getRegistration("/sw.js");
          if (!pwaReg) {
            const registration = await navigator.serviceWorker.register("/sw.js", {
              scope: "/"
            });
            console.log("✅ PWA Service Worker registered");

            // Listen for updates
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("🔄 New service worker available");
                    // Optionally notify user about update
                  }
                });
              }
            });
          } else {
            console.log("ℹ️ PWA Service Worker already registered");
          }
        } catch (err) {
          console.error("❌ Service Worker registration failed:", err);
        }
      })();
    }
  }, []);

  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="NexGuard" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NexGuard" />
        <meta name="description" content="Advanced AI-powered surveillance and security monitoring system" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-152x152.png" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />
        <link rel="shortcut icon" href="/icons/icon-96x96.png" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <meta name="msapplication-config" content="none" />
        
        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
