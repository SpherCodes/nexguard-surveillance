'use client'

import React from 'react'
import Sidebar from '@/components/ui/Sidebar'
import RightFeed from '@/components/RightFeed'
import { Providers } from '../providers'
import BottomNav from '@/components/ui/BottomNav'

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Providers>
      <main className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-gray-50 to-white">
        {/* Sidebar hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex-col overflow-y-auto ml-2 mr-2 my-2 rounded-2xl bg-gradient-to-br from-white via-gray-50/30 to-white border border-gray-200/60 shadow-xl backdrop-blur-sm">
            {/* Add bottom padding on mobile to prevent BottomNav overlap */}
            <div className="p-4 sm:p-6 lg:p-10 pb-24 md:pb-10">
              {children}
            </div>
          </div>
          <div className="hidden w-80 flex-col lg:flex">
            <RightFeed />
          </div>
        </div>
        {/* Bottom navigation visible only on mobile */}
        <BottomNav />
      </main>
    </Providers>
  )
}
export default RootLayout