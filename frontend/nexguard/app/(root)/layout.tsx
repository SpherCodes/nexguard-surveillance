'use client'

import React from 'react'
import Sidebar from '@/components/ui/Sidebar'
import RightFeed from '@/components/RightFeed'
import { Providers } from '../providers'
import { AuthProvider } from '@/context/AuthContext'
import BottomNav from '@/components/ui/BottomNav'
import 'video.js/dist/video-js.css';

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Providers>
      <AuthProvider>
        <main className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-gray-50 to-white">
          {/* Sidebar hidden on mobile */}
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex-col overflow-y-auto ml-0 md:ml-2 mr-0 lg:mr-2 my-0 md:my-1 rounded-none md:rounded-2xl bg-gradient-to-br from-white via-gray-50/30 to-white border-0 md:border md:border-gray-200/60 md:shadow-xl backdrop-blur-sm">
              {/* Further reduced padding for a tighter layout; smaller safe-area bottom offset */}
              <div className="p-1 sm:p-2 md:p-3 lg:p-4 pb-8 md:pb-3 lg:pb-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
                {children}
              </div>
            </div>
            <div className="hidden w-72 lg:w-80 flex-col lg:flex">
              <RightFeed />
            </div>
          </div>
          {/* Bottom navigation visible only on mobile */}
          <BottomNav />
        </main>
      </AuthProvider>
    </Providers>
  )
}
export default RootLayout