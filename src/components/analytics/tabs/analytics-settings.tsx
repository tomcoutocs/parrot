"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function AnalyticsSettings() {
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
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>User Behavior Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track clicks, scrolls, and interactions
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Session Recording</Label>
              <p className="text-sm text-muted-foreground">
                Record user sessions for analysis
              </p>
            </div>
            <Switch defaultChecked={false} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>IP Address Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track user IP addresses for location data
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Button>Save Tracking Settings</Button>
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
            <Select defaultValue="2_years">
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
            <Switch defaultChecked />
          </div>
          <Button>Save Retention Settings</Button>
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
            <Select defaultValue="utc">
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
            <Select defaultValue="mm_dd_yyyy">
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
            <Switch defaultChecked={false} />
          </div>
          <Button>Save Report Settings</Button>
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
                <input type="radio" id="pdf" name="export" defaultChecked className="w-4 h-4" />
                <Label htmlFor="pdf" className="font-normal cursor-pointer">PDF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" id="csv" name="export" className="w-4 h-4" />
                <Label htmlFor="csv" className="font-normal cursor-pointer">CSV</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" id="excel" name="export" className="w-4 h-4" />
                <Label htmlFor="excel" className="font-normal cursor-pointer">Excel</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" id="json" name="export" className="w-4 h-4" />
                <Label htmlFor="json" className="font-normal cursor-pointer">JSON</Label>
              </div>
            </div>
          </div>
          <Button>Save Export Settings</Button>
        </CardContent>
      </Card>
    </div>
  )
}

