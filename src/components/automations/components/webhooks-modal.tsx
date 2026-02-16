"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Copy, ExternalLink } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSession } from '@/components/providers/session-provider'
import { useRouter } from 'next/navigation'

interface WebhookItem {
  id: string
  name: string
  url: string | null
  hasToken: boolean
  isActive: boolean
  createdAt: string
}

function GenerateUrlButton({
  automationId,
  userId,
  onGenerated,
}: {
  automationId: string
  userId: string
  onGenerated: () => void
}) {
  const [loading, setLoading] = useState(false)
  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/automations/webhooks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationId, userId }),
      })
      const json = await res.json()
      if (json.success) {
        toastSuccess('Webhook URL generated')
        onGenerated()
      } else {
        toastError(json.error || 'Failed to generate')
      }
    } catch (e) {
      toastError('Failed to generate webhook URL')
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate URL'}
    </Button>
  )
}

interface WebhooksModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WebhooksModal({ isOpen, onClose }: WebhooksModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])

  const userId = session?.user?.id ?? (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('auth-user') || 'null')?.id : null)
  const spaceId = session?.user?.company_id ?? null

  const fetchWebhooks = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ userId })
      if (spaceId) params.set('spaceId', spaceId)
      const res = await fetch(`/api/automations/webhooks?${params}`)
      const json = await res.json()
      if (json.success) {
        setWebhooks(json.data || [])
      } else {
        toastError(json.error || 'Failed to fetch webhooks')
      }
    } catch (e) {
      toastError('Failed to fetch webhooks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      fetchWebhooks()
    }
  }, [isOpen, userId, spaceId])

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toastSuccess('Webhook URL copied to clipboard')
  }

  const handleCreateWebhook = () => {
    onClose()
    router.push('/apps/automations?tab=builder')
  }

  const handleEditWebhook = (id: string) => {
    onClose()
    router.push(`/apps/automations?tab=builder&id=${id}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Webhooks</DialogTitle>
          <DialogDescription>
            Webhook automations run when external services POST to this URL. Create a webhook-triggered automation in the builder.
          </DialogDescription>
        </DialogHeader>

        {!userId ? (
          <p className="text-sm text-muted-foreground">Please sign in to manage webhooks.</p>
        ) : (
          <div className="space-y-4">
            <Button onClick={handleCreateWebhook} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Create Webhook Automation
            </Button>

            <div>
              <h4 className="font-medium text-sm mb-2">Your webhook endpoints</h4>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : webhooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No webhook automations yet. Create one in the builder with a Webhook trigger.
                </p>
              ) : (
                <ul className="space-y-3">
                  {webhooks.map((w) => (
                    <li key={w.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{w.name}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            w.isActive ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {w.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {w.url ? (
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            value={w.url}
                            className="font-mono text-xs bg-muted"
                          />
                          <Button variant="outline" size="sm" onClick={() => copyUrl(w.url!)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditWebhook(w.id)}>
                            Edit
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground flex-1">
                            No webhook URL yet.
                          </p>
                          <GenerateUrlButton
                            automationId={w.id}
                            userId={userId!}
                            onGenerated={fetchWebhooks}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
