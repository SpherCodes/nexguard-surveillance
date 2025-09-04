'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import React from 'react'

/**
 * BottomNav
 * Mobile-only bottom navigation bar using SidebarLinks.
 * - Fixed to bottom with safe-area padding
 * - Highlights active route
 * - Accessible with nav/aria-current semantics
 */
const BottomNav: React.FC = () => {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 z-50 md:hidden',
        'border-t border-gray-200/70 bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70',
        'shadow-[0_-8px_24px_rgba(0,0,0,0.08)]'
      )}
      aria-label="Primary"
      role="navigation"
      // Add iOS safe area padding
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.6rem)' }}
    >
      <ul className="grid grid-cols-3 gap-1.5 px-3 pt-2.5 pb-2.5">
        {SidebarLinks.map((item) => {
          const isActive = item.route === '/'
            ? pathname === item.route
            : pathname.startsWith(item.route)

          const Icon = item.icon
          return (
            <li key={item.route} className="flex">
              <Link
                href={item.route}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80',
                  isActive
                    ? 'bg-gray-900 text-white shadow-lg scale-105'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900 active:scale-95'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-bold truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default BottomNav
