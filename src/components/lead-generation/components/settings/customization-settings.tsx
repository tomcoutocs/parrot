"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getLeadCustomizationSettings, saveLeadCustomizationSettings } from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'

export function CustomizationSettings() {
  const [settings, setSettings] = useState({
    primary_color: '#3b82f6',
    logo_url: '',
    company_name: '',
    default_thank_you_message: '',
    default_redirect_url: '',
    default_stages_template: 'standard',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      const result = await getLeadCustomizationSettings()
      
      if (result.success && result.data) {
        setSettings({
          primary_color: result.data.primary_color || '#3b82f6',
          logo_url: result.data.logo_url || '',
          company_name: result.data.company_name || '',
          default_thank_you_message: result.data.default_thank_you_message || '',
          default_redirect_url: result.data.default_redirect_url || '',
          default_stages_template: result.data.default_stages_template || 'standard',
        })
      }
      setLoading(false)
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await saveLeadCustomizationSettings(settings)

      if (result.success) {
        toastSuccess('Customization settings saved successfully')
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
      <div className="text-center py-8 text-muted-foreground">Loading customization settings...</div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize the appearance of your forms and emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <Input 
              type="color" 
              value={settings.primary_color}
              onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
              className="w-20 h-10" 
            />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input 
              value={settings.logo_url}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png" 
            />
          </div>
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input 
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="Your Company" 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Defaults</CardTitle>
          <CardDescription>
            Set default values for new forms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Thank You Message</Label>
            <Textarea
              value={settings.default_thank_you_message}
              onChange={(e) => setSettings({ ...settings, default_thank_you_message: e.target.value })}
              placeholder="Thank you for your interest! We'll be in touch soon."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Default Redirect URL</Label>
            <Input 
              value={settings.default_redirect_url}
              onChange={(e) => setSettings({ ...settings, default_redirect_url: e.target.value })}
              placeholder="https://example.com/thank-you" 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>
            Customize your lead pipeline stages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Stages Template</Label>
            <Select 
              value={settings.default_stages_template}
              onValueChange={(value) => setSettings({ ...settings, default_stages_template: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (New, Contacted, Qualified, Proposal, Closed)</SelectItem>
                <SelectItem value="simple">Simple (New, Qualified, Closed)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Customization'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

