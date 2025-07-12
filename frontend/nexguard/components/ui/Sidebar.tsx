'use client'

import { SidebarLinks } from '@/constants'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const Sidebar = () => {
  const pathname = usePathname()

  return (
    <aside className="h-screen w-52 bg-white flex flex-col">
      <nav className="flex flex-col p-5 gap-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image 
            src="/NexGuardShield.png"
            alt="NexGuard Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <div>
            <h1 className="text-lg font-semibold text-gray-800">NexGuard</h1>
            <p className="text-xs text-gray-500 leading-tight">Security System</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <ul className="flex flex-col gap-1">
          {SidebarLinks.map((item) => {
            const isActive = pathname === item.route || pathname.startsWith(item.route)

            return (
              <li key={item.label}>
                <Link
                  href={item.route}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 shadow-inner' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  {item.icon && (
                    <item.icon
                      className={`h-5 w-5 transition-colors ${
                        isActive ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar
