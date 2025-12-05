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
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import { updateCompany } from '@/lib/database-functions'

interface KlaviyoCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  companyId: string
  initialCredentials?: {
    public_api_key?: string
    private_api_key?: string
  }
}

export function KlaviyoCredentialsModal({
  isOpen,
  onClose,
  onSaved,
  companyId,
  initialCredentials
}: KlaviyoCredentialsModalProps) {
  const [loading, setLoading] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  
  const [credentials, setCredentials] = useState({
    public_api_key: '',
    private_api_key: ''
  })

  useEffect(() => {
    if (isOpen && initialCredentials) {
      setCredentials({
        public_api_key: initialCredentials.public_api_key || '',
        private_api_key: initialCredentials.private_api_key || ''
      })
    } else if (isOpen) {
      setCredentials({
        public_api_key: '',
        private_api_key: ''
      })
    }
  }, [isOpen, initialCredentials])

  const toggleShowSecret = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const result = await updateCompany(companyId, {
        klaviyo_public_api_key: credentials.public_api_key || undefined,
        klaviyo_private_api_key: credentials.private_api_key || undefined,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to save credentials')
      }

      toastSuccess('Klaviyo credentials saved successfully')
      onSaved()
      onClose()
    } catch (error) {
      console.error('Error saving Klaviyo credentials:', error)
      toastError(error instanceof Error ? error.message : 'Failed to save credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Klaviyo API Credentials</DialogTitle>
          <DialogDescription>
            Enter your Klaviyo API credentials. All sensitive fields are encrypted before storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="public_api_key">
              Public API Key (Site ID) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="public_api_key"
              type="text"
              value={credentials.public_api_key}
              onChange={(e) => setCredentials({ ...credentials, public_api_key: e.target.value })}
              placeholder="6-character Site ID"
              className="font-mono text-sm"
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">
              6-character public API key (Site ID) used for client-side API calls
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="private_api_key">
              Private API Key <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="private_api_key"
                type={showSecrets.private_api_key ? 'text' : 'password'}
                value={credentials.private_api_key}
                onChange={(e) => setCredentials({ ...credentials, private_api_key: e.target.value })}
                placeholder="Enter private API key"
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('private_api_key')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.private_api_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Private API key used for server-side API calls with read/write access
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || !credentials.public_api_key || !credentials.private_api_key}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Credentials'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

