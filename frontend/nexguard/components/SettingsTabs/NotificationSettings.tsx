'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/hooks/useNotifications'
import { Bell, BellOff } from 'lucide-react'
import { notificationPreferencesAPI, NotificationPreferences } from '../../lib/notificationPreferencesAPI'
import { toast } from 'sonner'

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
      } catch (error) {
        console.error('Failed to load notification preferences:', error)
        toast.error('Failed to load notification preferences')
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
      
      toast.success('Notification preferences updated successfully')
    } catch (error) {
      console.error(`Error updating ${key} preference:`, error)
      toast.error('Failed to update notification preferences')
      
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
    <div className="space-y-6">
      {/* Notification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notification Status
          </CardTitle>
          <CardDescription>
            Manage your push notification settings and devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Browser Permissions</Label>
              <p className="text-sm text-gray-500">
                Permission status for this browser
              </p>
            </div>
            <Badge variant={permissionStatus.variant} className={permissionStatus.color}>
              {permissionStatus.text}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Current Device Token</Label>
              <p className="text-sm text-gray-500">
                {currentDeviceToken ? 'This device is registered for notifications' : 'No active token'}
              </p>
            </div>
            <Badge variant={currentDeviceToken ? 'default' : 'secondary'}>
              {currentDeviceToken ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="flex gap-2">
            {currentDeviceToken === null || !currentDeviceToken ? (
              <Button onClick={() => toggleNotifications()} className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Enable Notifications
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => currentDeviceToken && toggleNotifications()}
                  className="flex items-center gap-2"
                >
                  <BellOff className="h-4 w-4" />
                  Disable Notifications
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose what types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">
              Loading preferences...
            </div>
          ) : (
            Object.entries(preferences).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor={key}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                  <p className="text-sm text-gray-500">
                    {getPreferenceDescription(key)}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={value}
                  disabled={updating}
                  onCheckedChange={(checked) => 
                    handlePreferenceChange(key, checked)
                  }
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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

export default NotificationSettings
