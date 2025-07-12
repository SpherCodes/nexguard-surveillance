'use client'
import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/ui/Sidebar'
import RightFeed from '@/components/ui/RightFeed'
import { getLatestAlerts } from '@/lib/actions/api.actions'

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  const [recentAlerts, setRecentAlerts] = useState<any[]>([])

  useEffect(() => {
    getLatestAlerts().then(alerts => {
      setRecentAlerts(alerts)
    })
  }, [])

  return (
    <main className="flex h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex-col mx-1 h-screen overflow-y-auto">
        {children}
      </div>
      <div className=" flex flex-col max-w-[22em] w-full">
        <RightFeed alertEvent={recentAlerts} />
      </div>
    </main>
  )
}

export default RootLayout
