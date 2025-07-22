'use client'

import { SidebarLinks } from '@/constants'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { cn } from '@/lib/utils'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'

const Sidebar = () => {
  const pathname = usePathname()
  return (
    <TooltipProvider delayDuration={0}>
      <aside className="h-screen min-w-[5em] flex flex-col bg-white">
        <div className="flex flex-col items-center px-2 py-5">
          <Link
            href="/"
            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full text-lg font-semibold"
          >
            <Image 
              src="/NexGuardShield.png"
              alt="NexGuard Logo"
              width={60}
              height={60}
              className="transition-transform group-hover:scale-110"
            />
            <span className="sr-only">NexGuard</span>
          </Link>
        </div>
        <nav className="flex flex-col items-center gap-4 flex-grow justify-center">
          {SidebarLinks.map((item) => {
            const isActive = item.route === '/' 
              ? pathname === item.route 
              : pathname.startsWith(item.route);

            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.route}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900",
                      isActive && "bg-gray-900 text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Bottom Section: User Profile
        <div className="mt-auto flex flex-col items-center gap-4 p-4">
            <Avatar className="h-10 w-10 border dark:border-gray-700">
                <AvatarImage src="https://github.com/shadcn.png" alt="User Avatar" />
                <AvatarFallback>U</AvatarFallback>
            </Avatar>
        </div> */}

      </aside>
    </TooltipProvider>
  )
}

export default Sidebar