import React, { Children } from 'react'
import Sidebar from '../../components/ui/Sidebar'

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className='flex h-screen w-full font-inter'>
      <Sidebar />
      <div className='size-full flex-col bg-white'>
        <div className='root-layout'>
            
        </div>
        {children}
      </div>
    </main>
  )
}

export default RootLayout
