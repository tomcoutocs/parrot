"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

export function GeneralSettings() {
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
            <Input placeholder="Enter your company name" />
          </div>
          <div className="space-y-2">
            <Label>Default Email</Label>
            <Input type="email" placeholder="notifications@company.com" />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input placeholder="UTC" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-assign Leads</Label>
              <p className="text-xs text-muted-foreground">
                Automatically assign new leads to team members
              </p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive email alerts for new leads
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Button variant="outline">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  )
}

