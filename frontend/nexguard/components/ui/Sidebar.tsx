'use client'

import { SidebarLinks } from '@/constants'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import SidebarFooter from '@/components/ui/SidebarFooter'

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={cn(
          // Hide the desktop sidebar on small screens (we use BottomNav there)
          "hidden md:flex h-screen flex-col bg-gradient-to-br from-slate-50 via-gray-50 to-white border-r border-gray-200/60 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "w-64" : "w-[5rem]"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[length:20px_20px] bg-gradient-to-br from-transparent via-gray-100/20 to-transparent"></div>
        </div>
        
        {/* Brand */}
        <div className="relative flex flex-col items-center px-4 py-6 border-b border-gray-200/50">
          <Link
            href="/"
            className="group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-lg border border-gray-200/70 transition-all duration-300 hover:shadow-xl hover:scale-110 hover:-translate-y-1"
          >
            <div className="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Image 
              src="/NexGuardShield.png"
              alt="NexGuard Logo"
              width={32}
              height={32}
              className="relative z-10 transition-all duration-300 group-hover:scale-110 drop-shadow-md"
            />
            <span className="sr-only">NexGuard</span>
          </Link>
          {isExpanded && (
            <div className="mt-4 text-center animate-in fade-in duration-200">
              <h2 className="text-sm font-bold text-gray-800 tracking-wider">NEXGUARD</h2>
              <p className="text-xs text-gray-500 font-medium">SURVEILLANCE</p>
            </div>
          )}
        </div>
        {/* Nav */}
        <nav className="relative flex flex-col items-center gap-3 flex-grow justify-center px-4 py-6">
          {SidebarLinks.map((item, index) => {
            const isActive = item.route === '/' 
              ? pathname === item.route 
              : pathname.startsWith(item.route);

            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.route}
                    className={cn(
                      "relative group flex items-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 transform",
                      isExpanded 
                        ? "w-full h-12 px-4 rounded-xl justify-start" 
                        : "h-12 w-12 justify-center rounded-2xl",
                      isActive 
                        ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white shadow-xl scale-105 ring-2 ring-gray-900/30" 
                        : "bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-600 hover:bg-gradient-to-br hover:from-gray-50 hover:via-white hover:to-gray-50 hover:text-gray-900 shadow-md border border-gray-200/50 hover:border-gray-300/70"
                    )}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {isActive && (
                      <div className={cn(
                        "absolute inset-0 bg-blue-500/5 animate-pulse",
                        isExpanded ? "rounded-xl" : "rounded-2xl"
                      )}></div>
                    )}
                    <item.icon className={cn(
                      "relative z-10 transition-all duration-300",
                      isExpanded ? "h-5 w-5" : "h-5 w-5",
                      isActive ? "text-white drop-shadow-sm" : "text-gray-700 group-hover:text-gray-900"
                    )} />
                    
                    {isExpanded && (
                      <span className={cn(
                        "ml-3 text-sm font-medium transition-all duration-200 animate-in fade-in",
                        isActive ? "text-white" : "text-gray-700 group-hover:text-gray-900"
                      )}>
                        {item.label}
                      </span>
                    )}

                    {!isExpanded && <span className="sr-only">{item.label}</span>}
                    
                    {/* Active indicator */}
                    {isActive && !isExpanded && (
                      <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full shadow-lg"></div>
                    )}
                  </Link>
                </TooltipTrigger>
                {!isExpanded && (
                  <TooltipContent side="right" sideOffset={12} className="bg-gray-900 text-white border-gray-800 shadow-xl">
                    <p className="font-semibold text-sm">{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Footer */}
        <SidebarFooter 
          currentUser={user ?? undefined} 
          onSignOut={signOut} 
          signingOut={false}
          isExpanded={isExpanded}
        />

      </aside>
    </TooltipProvider>
  )
}

export default Sidebar