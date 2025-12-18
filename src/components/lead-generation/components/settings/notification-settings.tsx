"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getLeadNotificationSettings, saveLeadNotificationSettings } from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'

export function NotificationSettings() {
  const [settings, setSettings] = useState({
    new_lead_alerts: true,
    high_score_leads: true,
    workflow_triggers: false,
    daily_summary: false,
    high_score_threshold: 80,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      const result = await getLeadNotificationSettings()
      
      if (result.success && result.data) {
        setSettings({
          new_lead_alerts: result.data.new_lead_alerts !== undefined ? result.data.new_lead_alerts : true,
          high_score_leads: result.data.high_score_leads !== undefined ? result.data.high_score_leads : true,
          workflow_triggers: result.data.workflow_triggers || false,
          daily_summary: result.data.daily_summary || false,
          high_score_threshold: result.data.high_score_threshold || 80,
        })
      }
      setLoading(false)
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await saveLeadNotificationSettings(settings)

      if (result.success) {
        toastSuccess('Notification preferences saved successfully')
      } else {
        toastError(result.error || 'Failed to save preferences')
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading notification settings...</div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose when and how you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Lead Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when a new lead is captured
                </p>
              </div>
              <Switch 
                checked={settings.new_lead_alerts}
                onCheckedChange={(checked) => setSettings({ ...settings, new_lead_alerts: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>High-Score Leads</Label>
                <p className="text-xs text-muted-foreground">
                  Alert for leads with score above threshold
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.high_score_threshold}
                  onChange={(e) => setSettings({ ...settings, high_score_threshold: parseInt(e.target.value) || 80 })}
                  className="w-20 h-8"
                />
                <Switch 
                  checked={settings.high_score_leads}
                  onCheckedChange={(checked) => setSettings({ ...settings, high_score_leads: checked })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Workflow Triggers</Label>
                <p className="text-xs text-muted-foreground">
                  Notifications when workflows are triggered
                </p>
              </div>
              <Switch 
                checked={settings.workflow_triggers}
                onCheckedChange={(checked) => setSettings({ ...settings, workflow_triggers: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Summary</Label>
                <p className="text-xs text-muted-foreground">
                  Receive daily lead generation summary
                </p>
              </div>
              <Switch 
                checked={settings.daily_summary}
                onCheckedChange={(checked) => setSettings({ ...settings, daily_summary: checked })}
              />
            </div>
          </div>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

