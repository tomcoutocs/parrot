"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Key, Webhook } from 'lucide-react'

export function AutomationsSettings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Automation Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your automation preferences and integrations
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage API keys for external integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage API Keys
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Webhooks
            </CardTitle>
            <CardDescription>
              Configure webhook endpoints for triggers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Manage Webhooks
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

