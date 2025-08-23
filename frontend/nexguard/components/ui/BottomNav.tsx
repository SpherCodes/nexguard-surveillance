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
        'fixed bottom-0 inset-x-0 z-50 border-t border-gray-200/70 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60',
        'md:hidden'
      )}
      aria-label="Primary"
      role="navigation"
      // Add iOS safe area padding
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
    >
      <ul className="grid grid-cols-3 gap-1 px-2 pt-2 pb-2">
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
                  'flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only sm:ml-1">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default BottomNav
