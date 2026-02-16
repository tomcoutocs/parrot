"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail } from 'lucide-react'
import { upsertLeadIntegration } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

interface EmailConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConnected: () => void
  existingIntegration?: { id?: string; integration_name?: string; credentials?: Record<string, unknown> } | null
}

export function EmailConnectionModal({
  isOpen,
  onClose,
  onConnected,
  existingIntegration = null,
}: EmailConnectionModalProps) {
  const { data: session } = useSession()
  const existingCredentials = (existingIntegration?.credentials || {}) as Record<string, unknown>
  const [method, setMethod] = useState<'smtp' | 'resend'>((existingCredentials.method as 'smtp' | 'resend') || 'smtp')
  const [senderName, setSenderName] = useState(existingIntegration?.integration_name || '')
  const [smtpHost, setSmtpHost] = useState((existingCredentials.smtpHost as string) || '')
  const [smtpPort, setSmtpPort] = useState((existingCredentials.smtpPort as string) || '587')
  const [smtpUser, setSmtpUser] = useState((existingCredentials.smtpUser as string) || '')
  const [smtpPass, setSmtpPass] = useState((existingCredentials.smtpPass as string) || '')
  const [fromEmail, setFromEmail] = useState((existingCredentials.fromEmail as string) || '')
  const [resendApiKey, setResendApiKey] = useState((existingCredentials.resendApiKey as string) || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (existingIntegration) {
        setSenderName(existingIntegration.integration_name || '')
        setSmtpHost((existingCredentials.smtpHost as string) || '')
        setSmtpPort((existingCredentials.smtpPort as string) || '587')
        setSmtpUser((existingCredentials.smtpUser as string) || '')
        setFromEmail((existingCredentials.fromEmail as string) || '')
        setResendApiKey((existingCredentials.resendApiKey as string) || '')
        setMethod((existingCredentials.method as 'smtp' | 'resend') || 'smtp')
      } else {
        setSenderName('')
        setSmtpHost('')
        setSmtpPort('587')
        setSmtpUser('')
        setSmtpPass('')
        setFromEmail('')
        setResendApiKey('')
        setMethod('smtp')
      }
    }
  }, [isOpen, existingIntegration])

  const handleConnect = async () => {
    if (!session?.user?.id) {
      toastError('You must be logged in to connect')
      return
    }

    const credentials =
      method === 'smtp'
        ? { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, method: 'smtp' }
        : { resendApiKey, fromEmail, method: 'resend' }

    const isValid =
      method === 'smtp'
        ? smtpHost && smtpPort && smtpUser && smtpPass && fromEmail
        : resendApiKey && fromEmail

    if (!isValid) {
      toastError('Please fill in all required fields')
      return
    }

    const integrationName = (senderName || fromEmail || 'Campaign Email').trim()

    setSaving(true)
    try {
      const result = await upsertLeadIntegration({
        integration_type: 'email_marketing',
        integration_name: integrationName,
        is_active: true,
        credentials,
        userOnly: true,
      })

      if (result.success) {
        toastSuccess('Email sender connected successfully')
        onConnected()
        onClose()
      } else {
        toastError(result.error || 'Failed to connect email')
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to connect')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {existingIntegration ? 'Edit Email Sender' : 'Add Email Sender'}
          </DialogTitle>
          <DialogDescription>
            Connect an email account to send campaign emails. Use a descriptive name (e.g. &quot;Sales&quot;, &quot;Support&quot;) to identify this sender.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="senderName">Sender name</Label>
          <Input
            id="senderName"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="e.g. Sales, Support, noreply@company.com"
          />
        </div>

        <Tabs value={method} onValueChange={(v) => setMethod(v as 'smtp' | 'resend')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="smtp">SMTP</TabsTrigger>
            <TabsTrigger value="resend">Resend API</TabsTrigger>
          </TabsList>

          <TabsContent value="smtp" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpUser">Username</Label>
              <Input
                id="smtpUser"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtpPass">Password / App Password</Label>
              <Input
                id="smtpPass"
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input
                id="fromEmail"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
            </div>
          </TabsContent>

          <TabsContent value="resend" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Use your Resend API key to send emails. Get your key at resend.com
            </p>
            <div className="space-y-2">
              <Label htmlFor="resendKey">Resend API Key</Label>
              <Input
                id="resendKey"
                type="password"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="re_xxxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fromEmailResend">From Email</Label>
              <Input
                id="fromEmailResend"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={saving}>
            {saving ? 'Connecting...' : 'Connect'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
