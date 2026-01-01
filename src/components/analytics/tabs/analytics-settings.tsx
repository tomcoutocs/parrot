"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAnalyticsSettings, saveAnalyticsSettings, type AnalyticsSettings } from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'
import { Loader2 } from 'lucide-react'

export function AnalyticsSettings() {
  const [settings, setSettings] = useState<AnalyticsSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const result = await getAnalyticsSettings()
      if (result.success && result.data) {
        setSettings(result.data)
        console.log('Analytics settings loaded:', result.data)
      } else {
        console.warn('Failed to load analytics settings:', result.error)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTracking = async () => {
    if (!settings) return
    setSaving('tracking')
    try {
      const result = await saveAnalyticsSettings({ tracking: settings.tracking })
      if (result.success) {
        toastSuccess('Tracking settings saved successfully')
      } else {
        toastError(result.error || 'Failed to save settings')
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to save settings')
    } finally {
      setSaving(null)
    }
  }

  const handleSaveRetention = async () => {
    if (!settings) return
    setSaving('retention')
    try {
      const result = await saveAnalyticsSettings({ dataRetention: settings.dataRetention })
      if (result.success) {
        toastSuccess('Retention settings saved successfully')
      } else {
        toastError(result.error || 'Failed to save settings')
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to save settings')
    } finally {
      setSaving(null)
    }
  }

  const handleSaveReports = async () => {
    if (!settings) return
    setSaving('reports')
    try {
      const result = await saveAnalyticsSettings({ reports: settings.reports })
      if (result.success) {
        toastSuccess('Report settings saved successfully')
      } else {
        toastError(result.error || 'Failed to save settings')
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to save settings')
    } finally {
      setSaving(null)
    }
  }

  const handleSaveExport = async () => {
    if (!settings) return
    setSaving('export')
    try {
      const result = await saveAnalyticsSettings({ export: settings.export })
      if (result.success) {
        toastSuccess('Export settings saved successfully')
      } else {
        toastError(result.error || 'Failed to save settings')
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to save settings')
    } finally {
      setSaving(null)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Tracking Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tracking Settings</CardTitle>
          <CardDescription>Configure what data to track</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Page View Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track page views and navigation
              </p>
            </div>
            <Switch 
              checked={settings.tracking.pageViewTracking}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, tracking: { ...settings.tracking, pageViewTracking: checked } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>User Behavior Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track clicks, scrolls, and interactions
              </p>
            </div>
            <Switch 
              checked={settings.tracking.userBehaviorTracking}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, tracking: { ...settings.tracking, userBehaviorTracking: checked } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Session Recording</Label>
              <p className="text-sm text-muted-foreground">
                Record user sessions for analysis
              </p>
            </div>
            <Switch 
              checked={settings.tracking.sessionRecording}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, tracking: { ...settings.tracking, sessionRecording: checked } })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>IP Address Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track user IP addresses for location data
              </p>
            </div>
            <Switch 
              checked={settings.tracking.ipAddressTracking}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, tracking: { ...settings.tracking, ipAddressTracking: checked } })
              }
            />
          </div>
          <Button onClick={handleSaveTracking} disabled={saving === 'tracking'}>
            {saving === 'tracking' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Tracking Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Data Retention</CardTitle>
          <CardDescription>Configure how long to keep analytics data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retention-period">Retention Period</Label>
            <Select 
              value={settings.dataRetention.retentionPeriod}
              onValueChange={(value: any) => 
                setSettings({ 
                  ...settings, 
                  dataRetention: { ...settings.dataRetention, retentionPeriod: value } 
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3_months">3 Months</SelectItem>
                <SelectItem value="6_months">6 Months</SelectItem>
                <SelectItem value="1_year">1 Year</SelectItem>
                <SelectItem value="2_years">2 Years</SelectItem>
                <SelectItem value="unlimited">Unlimited</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Archive Old Data</Label>
              <p className="text-sm text-muted-foreground">
                Automatically archive data older than retention period
              </p>
            </div>
            <Switch 
              checked={settings.dataRetention.autoArchiveOldData}
              onCheckedChange={(checked) => 
                setSettings({ 
                  ...settings, 
                  dataRetention: { ...settings.dataRetention, autoArchiveOldData: checked } 
                })
              }
            />
          </div>
          <Button onClick={handleSaveRetention} disabled={saving === 'retention'}>
            {saving === 'retention' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Retention Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Report Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Report Settings</CardTitle>
          <CardDescription>Configure default report preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-timezone">Default Timezone</Label>
            <Select 
              value={settings.reports.defaultTimezone}
              onValueChange={(value: any) => 
                setSettings({ 
                  ...settings, 
                  reports: { ...settings.reports, defaultTimezone: value } 
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utc">UTC</SelectItem>
                <SelectItem value="est">Eastern Time</SelectItem>
                <SelectItem value="pst">Pacific Time</SelectItem>
                <SelectItem value="cst">Central Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-format">Date Format</Label>
            <Select 
              value={settings.reports.dateFormat}
              onValueChange={(value: any) => 
                setSettings({ 
                  ...settings, 
                  reports: { ...settings.reports, dateFormat: value } 
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mm_dd_yyyy">MM/DD/YYYY</SelectItem>
                <SelectItem value="dd_mm_yyyy">DD/MM/YYYY</SelectItem>
                <SelectItem value="yyyy_mm_dd">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Refresh Reports</Label>
              <p className="text-sm text-muted-foreground">
                Automatically refresh reports every 5 minutes
              </p>
            </div>
            <Switch 
              checked={settings.reports.autoRefreshReports}
              onCheckedChange={(checked) => 
                setSettings({ 
                  ...settings, 
                  reports: { ...settings.reports, autoRefreshReports: checked } 
                })
              }
            />
          </div>
          <Button onClick={handleSaveReports} disabled={saving === 'reports'}>
            {saving === 'reports' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Report Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Export Settings</CardTitle>
          <CardDescription>Configure export formats and options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Export Format</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="pdf" 
                  name="export" 
                  checked={settings.export.defaultExportFormat === 'pdf'}
                  onChange={() => 
                    setSettings({ 
                      ...settings, 
                      export: { ...settings.export, defaultExportFormat: 'pdf' } 
                    })
                  }
                  className="w-4 h-4" 
                />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">PDF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="csv" 
                  name="export" 
                  checked={settings.export.defaultExportFormat === 'csv'}
                  onChange={() => 
                    setSettings({ 
                      ...settings, 
                      export: { ...settings.export, defaultExportFormat: 'csv' } 
                    })
                  }
                  className="w-4 h-4" 
                />
                <Label htmlFor="csv" className="font-normal cursor-pointer">CSV</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="excel" 
                  name="export" 
                  checked={settings.export.defaultExportFormat === 'excel'}
                  onChange={() => 
                    setSettings({ 
                      ...settings, 
                      export: { ...settings.export, defaultExportFormat: 'excel' } 
                    })
                  }
                  className="w-4 h-4" 
                />
                <Label htmlFor="excel" className="font-normal cursor-pointer">Excel</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="json" 
                  name="export" 
                  checked={settings.export.defaultExportFormat === 'json'}
                  onChange={() => 
                    setSettings({ 
                      ...settings, 
                      export: { ...settings.export, defaultExportFormat: 'json' } 
                    })
                  }
                  className="w-4 h-4" 
                />
                <Label htmlFor="json" className="font-normal cursor-pointer">JSON</Label>
              </div>
            </div>
          </div>
          <Button onClick={handleSaveExport} disabled={saving === 'export'}>
            {saving === 'export' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Export Settings'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

