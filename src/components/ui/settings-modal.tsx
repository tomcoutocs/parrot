'use client'

import React, { useState } from 'react'
import { Settings, User, Bell, Shield, Palette, Moon, Sun, Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/components/providers/theme-provider'
import { useSession } from '@/components/providers/session-provider'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState(true)
  const [emailUpdates, setEmailUpdates] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="parrot-card-enhanced w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* User Profile Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Profile</h3>
            </div>
            <div className="pl-8 space-y-2">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{session?.user?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">{session?.user?.email}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Appearance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Appearance</h3>
            </div>
            <div className="pl-8 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Theme</Label>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    className="flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                    className="flex items-center gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    System
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {theme === 'system' 
                    ? 'Uses your system preference' 
                    : `Currently using ${theme} theme`
                  }
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Notifications</h3>
            </div>
            <div className="pl-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Push Notifications</Label>
                  <p className="text-xs text-gray-500">Receive notifications in your browser</p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Email Updates</Label>
                  <p className="text-xs text-gray-500">Receive updates via email</p>
                </div>
                <Switch
                  checked={emailUpdates}
                  onCheckedChange={setEmailUpdates}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Privacy & Security Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Privacy & Security</h3>
            </div>
            <div className="pl-8 space-y-2">
              <Button variant="outline" size="sm">
                Change Password
              </Button>
              <Button variant="outline" size="sm">
                Two-Factor Authentication
              </Button>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="default" onClick={onClose}>
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Quick theme toggle for the sidebar
export function QuickThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getThemeIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-4 w-4" />
    }
    return theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className="flex items-center gap-2"
      title={`Current theme: ${theme}. Click to cycle.`}
    >
      {getThemeIcon()}
      <span className="hidden sm:inline">{theme}</span>
    </Button>
  )
}
