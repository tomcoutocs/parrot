"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function NotificationSettings() {
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
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>High-Score Leads</Label>
                <p className="text-xs text-muted-foreground">
                  Alert for leads with score above 80
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Workflow Triggers</Label>
                <p className="text-xs text-muted-foreground">
                  Notifications when workflows are triggered
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Summary</Label>
                <p className="text-xs text-muted-foreground">
                  Receive daily lead generation summary
                </p>
              </div>
              <Switch />
            </div>
          </div>
          <Button variant="outline">Save Preferences</Button>
        </CardContent>
      </Card>
    </div>
  )
}

