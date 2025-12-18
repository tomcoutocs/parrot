"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'
import { fetchLeadIntegrations, upsertLeadIntegration } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

const availableIntegrations = [
  { id: 'crm', name: 'CRM', description: 'Sync leads to your CRM', type: 'crm' },
  { id: 'email', name: 'Email Marketing', description: 'Connect email campaigns', type: 'email_marketing' },
  { id: 'analytics', name: 'Analytics', description: 'Track conversions', type: 'analytics' },
  { id: 'ads', name: 'Advertising', description: 'Sync with ad platforms', type: 'advertising' },
]

export function IntegrationSettings() {
  const { data: session } = useSession()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadIntegrations = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      const result = await fetchLeadIntegrations(session.user.company_id)

      if (result.success && result.integrations) {
        setIntegrations(result.integrations)
      }
      setLoading(false)
    }

    loadIntegrations()
  }, [session?.user?.id, session?.user?.company_id])

  const getIntegrationStatus = (integrationId: string) => {
    const integration = integrations.find(i => 
      i.integration_type === availableIntegrations.find(ai => ai.id === integrationId)?.type
    )
    return integration?.is_active || false
  }

  const handleToggleIntegration = async (integrationId: string) => {
    if (!session?.user?.id) {
      toastError('You must be logged in to manage integrations')
      return
    }

    const integrationInfo = availableIntegrations.find(ai => ai.id === integrationId)
    if (!integrationInfo) return

    const currentStatus = getIntegrationStatus(integrationId)
    const newStatus = !currentStatus

    const result = await upsertLeadIntegration({
      space_id: session.user.company_id,
      integration_type: integrationInfo.type,
      integration_name: integrationInfo.name,
      is_active: newStatus,
    })

    if (result.success) {
      toastSuccess(`Integration ${newStatus ? 'connected' : 'disconnected'}`)
      // Reload integrations
      const reloadResult = await fetchLeadIntegrations(session.user.company_id)
      if (reloadResult.success && reloadResult.integrations) {
        setIntegrations(reloadResult.integrations)
      }
    } else {
      toastError(result.error || 'Failed to update integration')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading integrations...</div>
    )
  }

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
          {availableIntegrations.map((integration) => {
            const connected = getIntegrationStatus(integration.id)
            return (
              <div
                key={integration.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{integration.name}</h4>
                    {connected ? (
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
                <Button 
                  variant="outline"
                  onClick={() => handleToggleIntegration(integration.id)}
                >
                  {connected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

