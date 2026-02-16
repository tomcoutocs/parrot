"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSession } from '@/components/providers/session-provider'

interface ApiKey {
  id: string
  name: string
  created_at: string
}

interface ApiKeysModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [showKey, setShowKey] = useState(false)
  const [newName, setNewName] = useState('')
  const [newKey, setNewKey] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const userId = session?.user?.id ?? (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('auth-user') || 'null')?.id : null)
  const spaceId = session?.user?.company_id ?? null

  const fetchKeys = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ userId })
      if (spaceId) params.set('spaceId', spaceId)
      const res = await fetch(`/api/automations/api-keys?${params}`)
      const json = await res.json()
      if (json.success) {
        setKeys(json.data || [])
      } else {
        toastError(json.error || 'Failed to fetch API keys')
      }
    } catch (e) {
      toastError('Failed to fetch API keys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      fetchKeys()
    }
  }, [isOpen, userId, spaceId])

  const handleAdd = async () => {
    if (!newName.trim() || !newKey.trim() || !userId) {
      toastError('Name and key are required')
      return
    }
    setIsAdding(true)
    try {
      const res = await fetch('/api/automations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, spaceId: spaceId || undefined, name: newName.trim(), key: newKey.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        toastSuccess('API key added successfully')
        setNewName('')
        setNewKey('')
        setIsAdding(false)
        fetchKeys()
      } else {
        toastError(json.error || 'Failed to add API key')
      }
    } catch (e) {
      toastError('Failed to add API key')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (!confirm('Delete this API key? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/automations/api-keys/${id}?userId=${userId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toastSuccess('API key deleted')
        fetchKeys()
      } else {
        toastError(json.error || 'Failed to delete')
      }
    } catch (e) {
      toastError('Failed to delete API key')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage API Keys</DialogTitle>
          <DialogDescription>
            Add and manage API keys for external integrations. Keys are encrypted before storage.
          </DialogDescription>
        </DialogHeader>

        {!userId ? (
          <p className="text-sm text-muted-foreground">Please sign in to manage API keys.</p>
        ) : (
          <div className="space-y-4">
            {/* Add new */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium text-sm">Add new API key</h4>
              <div className="space-y-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Zapier, Make, Custom API"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-value">API Key</Label>
                <div className="relative">
                  <Input
                    id="key-value"
                    type={showKey ? 'text' : 'password'}
                    placeholder="Enter your API key"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleAdd} disabled={isAdding || !newName.trim() || !newKey.trim()}>
                {isAdding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add API Key
              </Button>
            </div>

            {/* List */}
            <div>
              <h4 className="font-medium text-sm mb-2">Saved API keys</h4>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No API keys yet. Add one above.</p>
              ) : (
                <ul className="space-y-2">
                  {keys.map((k) => (
                    <li
                      key={k.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{k.name}</span>
                      <span className="text-muted-foreground text-xs">
                        Added {new Date(k.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(k.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
