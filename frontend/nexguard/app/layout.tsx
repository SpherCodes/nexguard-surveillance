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
          const registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
          if (!registration) {
            await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            console.log("✅ Firebase Service Worker registered");
          } else {
            console.log("ℹ️ Firebase Service Worker already registered");
          }
        } catch (err) {
          console.error("❌ Service Worker registration failed:", err);
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
