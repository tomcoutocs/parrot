"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function UserManagementSettings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure user management preferences
        </p>
      </div>

      {/* Invitation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Invitation Settings</CardTitle>
          <CardDescription>Configure how user invitations work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invitation-expiry">Invitation Expiry (days)</Label>
            <Input id="invitation-expiry" type="number" defaultValue="7" />
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
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-assign Default Permissions</Label>
              <p className="text-sm text-muted-foreground">
                Automatically grant default app permissions to new users
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Button>Save Settings</Button>
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
              <Switch defaultChecked={false} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Invoicing</p>
                <p className="text-sm text-muted-foreground">Billing & Invoicing</p>
              </div>
              <Switch defaultChecked={false} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Lead Generation</p>
                <p className="text-sm text-muted-foreground">Lead Management</p>
              </div>
              <Switch defaultChecked={false} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Analytics</p>
                <p className="text-sm text-muted-foreground">Reports & Analytics</p>
              </div>
              <Switch defaultChecked={false} />
            </div>
          </div>
          <Button>Save Defaults</Button>
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
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require 2FA for admin users
              </p>
            </div>
            <Switch defaultChecked={false} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input id="session-timeout" type="number" defaultValue="60" />
          </div>
          <Button>Save Security Settings</Button>
        </CardContent>
      </Card>
    </div>
  )
}

