"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getUserManagementSettings, saveUserManagementSettings } from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'
import { Loader2, Save } from 'lucide-react'
import type { UserManagementSettings } from '@/lib/database-functions'

export function UserManagementSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<UserManagementSettings>({
    invitation_expiry_days: 7,
    require_email_verification: true,
    auto_assign_default_permissions: true,
    default_permissions: {
      crm: false,
      invoicing: false,
      leadGeneration: false,
      analytics: false,
    },
    require_strong_passwords: true,
    enable_two_factor_auth: false,
    session_timeout_minutes: 60,
  })

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      try {
        const result = await getUserManagementSettings()
        if (result.success && result.data) {
          setSettings(result.data)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleSaveInvitationSettings = async () => {
    setSaving(true)
    try {
      const result = await saveUserManagementSettings({
        invitation_expiry_days: settings.invitation_expiry_days,
        require_email_verification: settings.require_email_verification,
        auto_assign_default_permissions: settings.auto_assign_default_permissions,
      })

      if (result.success) {
        toastSuccess('Invitation settings saved successfully')
      } else {
        toastError(result.error || 'Failed to save settings')
      }
    } catch (error) {
      toastError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDefaultPermissions = async () => {
    setSaving(true)
    try {
      const result = await saveUserManagementSettings({
        default_permissions: settings.default_permissions,
      })

      if (result.success) {
        toastSuccess('Default permissions saved successfully')
      } else {
        toastError(result.error || 'Failed to save settings')
      }
    } catch (error) {
      toastError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSecuritySettings = async () => {
    setSaving(true)
    try {
      const result = await saveUserManagementSettings({
        require_strong_passwords: settings.require_strong_passwords,
        enable_two_factor_auth: settings.enable_two_factor_auth,
        session_timeout_minutes: settings.session_timeout_minutes,
      })

      if (result.success) {
        toastSuccess('Security settings saved successfully')
      } else {
        toastError(result.error || 'Failed to save settings')
      }
    } catch (error) {
      toastError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Invitation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Invitation Settings</CardTitle>
          <CardDescription>Configure how user invitations work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invitation-expiry">Invitation Expiry (days)</Label>
            <Input 
              id="invitation-expiry" 
              type="number" 
              value={settings.invitation_expiry_days}
              onChange={(e) => setSettings({ ...settings, invitation_expiry_days: parseInt(e.target.value) || 7 })}
              min="1"
              max="365"
            />
            <p className="text-xs text-muted-foreground">
              How long invitations remain valid before expiring
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                Users must verify their email before accessing the platform
              </p>
            </div>
            <Switch 
              checked={settings.require_email_verification}
              onCheckedChange={(checked) => setSettings({ ...settings, require_email_verification: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-assign Default Permissions</Label>
              <p className="text-sm text-muted-foreground">
                Automatically grant default app permissions to new users
              </p>
            </div>
            <Switch 
              checked={settings.auto_assign_default_permissions}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_assign_default_permissions: checked })}
            />
          </div>
          <Button onClick={handleSaveInvitationSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Default Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Default App Permissions</CardTitle>
          <CardDescription>Set default permissions for new internal users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">CRM</p>
                <p className="text-sm text-muted-foreground">Customer Relationship Management</p>
              </div>
              <Switch 
              checked={settings.default_permissions.crm}
              onCheckedChange={(checked) => setSettings({ 
                ...settings, 
                default_permissions: { ...settings.default_permissions, crm: checked }
              })}
            />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Invoicing</p>
                <p className="text-sm text-muted-foreground">Billing & Invoicing</p>
              </div>
              <Switch 
              checked={settings.default_permissions.invoicing}
              onCheckedChange={(checked) => setSettings({ 
                ...settings, 
                default_permissions: { ...settings.default_permissions, invoicing: checked }
              })}
            />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Lead Generation</p>
                <p className="text-sm text-muted-foreground">Lead Management</p>
              </div>
              <Switch 
              checked={settings.default_permissions.leadGeneration}
              onCheckedChange={(checked) => setSettings({ 
                ...settings, 
                default_permissions: { ...settings.default_permissions, leadGeneration: checked }
              })}
            />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Analytics</p>
                <p className="text-sm text-muted-foreground">Reports & Analytics</p>
              </div>
              <Switch 
              checked={settings.default_permissions.analytics}
              onCheckedChange={(checked) => setSettings({ 
                ...settings, 
                default_permissions: { ...settings.default_permissions, analytics: checked }
              })}
            />
            </div>
          </div>
          <Button onClick={handleSaveDefaultPermissions} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Defaults
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Configure security and access policies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Strong Passwords</Label>
              <p className="text-sm text-muted-foreground">
                Enforce password complexity requirements
              </p>
            </div>
            <Switch 
              checked={settings.require_strong_passwords}
              onCheckedChange={(checked) => setSettings({ ...settings, require_strong_passwords: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require 2FA for admin users
              </p>
            </div>
            <Switch 
              checked={settings.enable_two_factor_auth}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_two_factor_auth: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input 
              id="session-timeout" 
              type="number" 
              value={settings.session_timeout_minutes}
              onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 60 })}
              min="5"
              max="1440"
            />
          </div>
          <Button onClick={handleSaveSecuritySettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Security Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

