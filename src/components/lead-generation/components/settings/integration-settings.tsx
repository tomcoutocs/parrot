"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'

const integrations = [
  { id: 'crm', name: 'CRM', description: 'Sync leads to your CRM', connected: true },
  { id: 'email', name: 'Email Marketing', description: 'Connect email campaigns', connected: false },
  { id: 'analytics', name: 'Analytics', description: 'Track conversions', connected: true },
  { id: 'ads', name: 'Advertising', description: 'Sync with ad platforms', connected: false },
]

export function IntegrationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Connect your lead generation app with other tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{integration.name}</h4>
                  {integration.connected ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      Not Connected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{integration.description}</p>
              </div>
              <Button variant="outline">
                {integration.connected ? 'Configure' : 'Connect'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

