'use client'

import React from 'react'
import type { User } from '@/Types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarFooterProps {
  currentUser?: User | null
  onSignOut: () => void
  signingOut?: boolean
  isExpanded?: boolean
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({ currentUser, onSignOut, signingOut, isExpanded = false }) => {
  return (
    <div className="relative mt-auto px-4 py-4 border-t border-gray-200/50">
      <div className={cn(
        "flex items-center gap-3 rounded-2xl bg-gradient-to-br from-white via-gray-50 to-gray-100 border border-gray-200/70 px-3 py-3 shadow-lg backdrop-blur-sm transition-all duration-300",
        isExpanded ? "justify-between" : "justify-center"
      )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 min-w-0 cursor-pointer">
              <div className="relative">
                <Avatar className="h-9 w-9 ring-2 ring-gray-200/50 shadow-md">
                  <AvatarImage src="" alt="User Avatar" />
                  <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-blue-100 via-purple-50 to-blue-100 text-gray-800 border border-gray-200/50">
                    {(currentUser?.username?.[0] || '?').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
              </div>
              {isExpanded && (
                <div className="flex-1 min-w-0 animate-in fade-in duration-200">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {currentUser?.username || 'Guest'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <p className="text-xs text-gray-500 capitalize font-medium truncate">
                      {(currentUser?.role || 'viewer').replace('_', ' ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TooltipTrigger>
          {!isExpanded && (
            <TooltipContent side="right" sideOffset={12} className="bg-gray-900 text-white border-gray-800 shadow-xl">
              <div className="space-y-1 p-1">
                <p className="text-sm font-semibold">{currentUser?.username || 'Guest'}</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-xs text-gray-300 capitalize font-medium">{(currentUser?.role || 'viewer').replace('_', ' ')}</p>
                </div>
              </div>
            </TooltipContent>
          )}
        </Tooltip>

        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-xl border-gray-300/70 bg-gradient-to-br from-white to-gray-50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
            signingOut 
              ? "opacity-50 cursor-not-allowed" 
              : "hover:bg-gradient-to-br hover:from-red-50 hover:to-red-100 hover:border-red-300 hover:text-red-600"
          )}
          title="Sign out"
          onClick={onSignOut}
          disabled={signingOut}
        >
          <LogOut className={cn("h-4 w-4 transition-transform duration-300", signingOut && "animate-spin")} />
        </Button>
      </div>
    </div>
  )
}

export default SidebarFooter
