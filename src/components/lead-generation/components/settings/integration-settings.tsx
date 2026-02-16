"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Mail, Settings2, Plus } from 'lucide-react'
import { fetchLeadIntegrations, upsertLeadIntegration } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import { EmailConnectionModal } from '../modals/email-connection-modal'

export function IntegrationSettings() {
  const { data: session } = useSession()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [editingIntegration, setEditingIntegration] = useState<any | null>(null)

  useEffect(() => {
    loadIntegrations()
  }, [session?.user?.id])

  const loadIntegrations = async () => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const result = await fetchLeadIntegrations({ userOnly: true })

    if (result.success && result.integrations) {
      setIntegrations(result.integrations)
    }
    setLoading(false)
  }

  const emailIntegrations = integrations.filter(
    (i) => i.integration_type === 'email_marketing'
  )
  const activeEmailIntegrations = emailIntegrations.filter((i) => i.is_active)

  const handleDisconnect = async (integration: any) => {
    const result = await upsertLeadIntegration({
      integration_type: integration.integration_type,
      integration_name: integration.integration_name,
      is_active: false,
      userOnly: true,
    })

    if (result.success) {
      toastSuccess('Sender disconnected')
      loadIntegrations()
    } else {
      toastError(result.error || 'Failed to disconnect')
    }
  }

  const openAddSender = () => {
    setEditingIntegration(null)
    setEmailModalOpen(true)
  }

  const openEditSender = (integration: any) => {
    setEditingIntegration(integration)
    setEmailModalOpen(true)
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
          <CardTitle>Email Senders (Multi-Sender)</CardTitle>
          <CardDescription>
            Connect multiple email accounts to send campaign emails from different addresses. Each step in a campaign can use a different sender.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeEmailIntegrations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Connected senders</p>
              {activeEmailIntegrations.map((integration) => {
                const creds = (integration.credentials || {}) as Record<string, unknown>
                const fromEmail = (creds.fromEmail as string) || 'Unknown'
                return (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{integration.integration_name}</p>
                        <p className="text-sm text-muted-foreground">{fromEmail}</p>
                      </div>
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditSender(integration)}
                      >
                        <Settings2 className="w-4 h-4 mr-1" />
                        Settings
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(integration)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={openAddSender}>
            <Plus className="w-4 h-4 mr-2" />
            Add email sender
          </Button>
          {activeEmailIntegrations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Connect at least one email to send campaign emails. SMTP and Resend are supported.
            </p>
          )}
        </CardContent>
      </Card>

      <EmailConnectionModal
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false)
          setEditingIntegration(null)
        }}
        onConnected={loadIntegrations}
        existingIntegration={editingIntegration}
      />
    </div>
  )
}
