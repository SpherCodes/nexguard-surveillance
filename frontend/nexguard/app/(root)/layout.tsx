'use client'

import React from 'react'
import Sidebar from '@/components/ui/Sidebar'
import RightFeed from '@/components/RightFeed'
import { Providers } from '../providers'

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Providers>
      <main className="flex h-screen w-full bg-gradient-to-br from-slate-50 via-gray-50 to-white">
        <Sidebar />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex-col overflow-y-auto ml-2 mr-2 my-2 rounded-2xl bg-gradient-to-br from-white via-gray-50/30 to-white border border-gray-200/60 shadow-xl backdrop-blur-sm">
            <div className="p-6 sm:p-8 lg:p-10">
              {children}
            </div>
          </div>
          <div className="hidden w-80 flex-col lg:flex">
            <RightFeed />
          </div>
        </div>
      </main>
    </Providers>
  )
}
export default RootLayout