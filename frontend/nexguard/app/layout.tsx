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
    // Clean up any incorrectly registered service workers
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      (async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          
          // Unregister any SW that's not the Firebase messaging SW with correct scope
          for (const registration of registrations) {
            const scriptURL = registration.active?.scriptURL || '';
            const scope = registration.scope;
            
            // Keep only Firebase messaging SW with the correct scope
            if (scriptURL.includes('firebase-messaging-sw.js') && 
                scope.includes('firebase-cloud-messaging-push-scope')) {
              console.log("✅ Firebase messaging SW is correctly registered");
            } else if (scriptURL.includes('firebase-messaging-sw.js')) {
              // Unregister Firebase SW with wrong scope
              console.log("⚠️ Unregistering Firebase SW with incorrect scope:", scope);
              await registration.unregister();
            } else {
              // Unregister any other SW (e.g., Next.js PWA SW)
              console.log("⚠️ Unregistering non-Firebase SW:", scriptURL);
              await registration.unregister();
            }
          }
        } catch (err) {
          console.error("❌ Service Worker cleanup failed:", err);
        }
      })();
    }
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
