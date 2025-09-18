'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import { Bell, BellOff, Megaphone, User, AlertTriangle } from 'lucide-react'
import { notificationPreferencesAPI, NotificationPreferences } from '../../lib/actions/notificationPreferencesAPI'
import { notifications } from '@/lib/services/notification.service'

const getPreferenceDescription = (key: string): string => {
  switch (key) {
    case 'push_notifications':
      return 'Receive push notifications on this device'
    case 'detection_alerts':
      return 'Get notified when detections occur'
    case 'system_announcements':
      return 'Receive system-wide announcements'
    case 'account_updates':
      return 'Get notified about account changes'
    default:
      return ''
  }
}

const getPreferenceIcon = (key: string) => {
  switch (key) {
    case 'push_notifications':
      return <Bell className="h-4 w-4" />
    case 'detection_alerts':
      return <AlertTriangle className="h-4 w-4" />
    case 'system_announcements':
      return <Megaphone className="h-4 w-4" />
    case 'account_updates':
      return <User className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

// removed color helper to keep a single primary theme

const NotificationSettings: React.FC = () => {
  const { currentDeviceToken, notificationPermission, toggleNotifications } = useNotifications(); 

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_notifications: false,
    detection_alerts: false,
    system_announcements: false,
    account_updates: false
  })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Load preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true)
        const savedPreferences = await notificationPreferencesAPI.getPreferences()
        setPreferences(savedPreferences)
      } catch {
        notifications.error('Failed to load notification preferences', {
          description: 'Please refresh the page and try again.'
        })
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [])

  const handlePreferenceChange = async (key: string, checked: boolean) => {
    try {
      setUpdating(true)
      
      // Update local state optimistically
      const newPreferences = { ...preferences, [key]: checked }
      setPreferences(newPreferences)

      // Save to backend
      await notificationPreferencesAPI.updatePreferences(newPreferences)
      
      notifications.settingsUpdated('Notification Preferences')
    } catch (error) {
      console.error(`Error updating ${key} preference:`, error)
      notifications.error('Failed to update notification preferences', {
        description: 'Please try again.'
      })
      
      // Revert the change if there was an error
      setPreferences(prev => ({ ...prev, [key]: !checked }))
    } finally {
      setUpdating(false)
    }
  }

  const getPermissionStatus = () => {
    switch (notificationPermission) {
      case 'granted':
        return { text: 'Enabled', variant: 'default' as const, color: 'text-green-600' }
      case 'denied':
        return { text: 'Blocked', variant: 'destructive' as const, color: 'text-red-600' }
      default:
        return { text: 'Not Set', variant: 'secondary' as const, color: 'text-yellow-600' }
    }
  }

  const permissionStatus = getPermissionStatus()

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Permission Status Card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-lg sm:text-xl text-white font-semibold flex items-center gap-2">
              <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl">
                <Bell className="h-5 w-5 text-white" />
              </div>
              Push Notification Status
            </div>
            <Badge variant={permissionStatus.variant} className={`text-xs px-3 py-1.5 font-medium ${permissionStatus.variant==='default' ? 'bg-white text-gray-900' : ''}`}>
              {permissionStatus.text}
            </Badge>
          </div>
          <p className="text-gray-300 text-sm mt-2">Manage your push notification settings and devices</p>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <div className="grid gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="space-y-1 flex-1">
                <Label className="text-sm font-semibold text-gray-900">Browser Permissions</Label>
                <p className="text-xs sm:text-sm text-gray-600">
                  Permission status for this browser
                </p>
              </div>
              <Badge variant={permissionStatus.variant} className={`${permissionStatus.color} text-xs px-3 py-1.5 font-medium shrink-0`}>
                {permissionStatus.text}
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="space-y-1 flex-1">
                <Label className="text-sm font-semibold text-gray-900">Device Registration</Label>
                <p className="text-xs sm:text-sm text-gray-600">
                  {currentDeviceToken ? 'This device is registered for notifications' : 'Device not registered for notifications'}
                </p>
              </div>
              <Badge variant={currentDeviceToken ? 'default' : 'secondary'} className="text-xs px-3 py-1.5 font-medium shrink-0">
                {currentDeviceToken ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {currentDeviceToken === null || !currentDeviceToken ? (
              <Button 
                onClick={() => toggleNotifications()} 
                className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center gap-2 h-11 sm:h-10 font-semibold rounded-xl"
              >
                <Bell className="h-4 w-4" />
                Enable Notifications
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => currentDeviceToken && toggleNotifications()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 sm:h-10 font-semibold rounded-xl"
              >
                <BellOff className="h-4 w-4" />
                Disable Notifications
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6">
          <div className="text-lg sm:text-xl text-white font-semibold flex items-center gap-2">
            <div className="p-2 bg-white/15 backdrop-blur-sm rounded-xl">
              <Bell className="h-5 w-5 text-white" />
            </div>
            Notification Preferences
          </div>
          <p className="text-gray-300 text-sm mt-2">Choose what types of notifications you want to receive</p>
        </div>
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-sm font-medium">Loading preferences...</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {Object.entries(preferences).map(([key, value]) => {
                const preferenceIcon = getPreferenceIcon(key);
                
                return (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200">
                    <div className="flex items-start gap-3 flex-1 pr-4">
                      <div className={`p-2 rounded-lg bg-white shadow-sm ring-1 ring-gray-100 mt-1`}>
                        {preferenceIcon}
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <Label htmlFor={key} className="text-sm font-semibold text-gray-900 cursor-pointer">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                          {getPreferenceDescription(key)}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={key}
                      checked={value}
                      disabled={updating}
                      onCheckedChange={(checked) => 
                        handlePreferenceChange(key, checked)
                      }
                      className="shrink-0 data-[state=checked]:bg-gray-900"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings
