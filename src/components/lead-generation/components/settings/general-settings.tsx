"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { getLeadGenerationSettings, saveLeadGenerationSettings } from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'

export function GeneralSettings() {
  const [settings, setSettings] = useState({
    company_name: '',
    default_email: '',
    timezone: 'UTC',
    auto_assign_leads: false,
    email_notifications: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      const result = await getLeadGenerationSettings()
      
      if (result.success && result.data) {
        setSettings({
          company_name: result.data.company_name || '',
          default_email: result.data.default_email || '',
          timezone: result.data.timezone || 'UTC',
          auto_assign_leads: result.data.auto_assign_leads || false,
          email_notifications: result.data.email_notifications !== undefined ? result.data.email_notifications : true,
        })
      }
      setLoading(false)
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await saveLeadGenerationSettings(settings)

      if (result.success) {
        toastSuccess('Settings saved successfully')
      } else {
        toastError(result.error || 'Failed to save settings')
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure your lead generation app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input 
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="Enter your company name" 
            />
          </div>
          <div className="space-y-2">
            <Label>Default Email</Label>
            <Input 
              type="email"
              value={settings.default_email}
              onChange={(e) => setSettings({ ...settings, default_email: e.target.value })}
              placeholder="notifications@company.com" 
            />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input 
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              placeholder="UTC" 
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-assign Leads</Label>
              <p className="text-xs text-muted-foreground">
                Automatically assign new leads to team members
              </p>
            </div>
            <Switch 
              checked={settings.auto_assign_leads}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_assign_leads: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive email alerts for new leads
              </p>
            </div>
            <Switch 
              checked={settings.email_notifications}
              onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
            />
          </div>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

