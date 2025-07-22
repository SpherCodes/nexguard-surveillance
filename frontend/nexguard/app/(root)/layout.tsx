'use client'

import React from 'react'
import Sidebar from '@/components/ui/Sidebar'
import RightFeed from '@/components/ui/RightFeed'
import { Providers } from '../providers'

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Providers>
      <main className="flex h-screen w-full bg-white">
        <Sidebar />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex-col overflow-y-auto border rounded-xl bg-gray-100">
            <div className="p-4 sm:p-6 lg:p-8">
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