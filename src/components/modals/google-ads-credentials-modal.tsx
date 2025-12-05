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
import { Company } from '@/lib/supabase'

interface GoogleAdsCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  companyId: string
  initialCredentials?: {
    developer_token?: string
    client_id?: string
    client_secret?: string
    refresh_token?: string
    customer_id?: string
  }
}

export function GoogleAdsCredentialsModal({
  isOpen,
  onClose,
  onSaved,
  companyId,
  initialCredentials
}: GoogleAdsCredentialsModalProps) {
  const [loading, setLoading] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  
  const [credentials, setCredentials] = useState({
    developer_token: '',
    client_id: '',
    client_secret: '',
    refresh_token: '',
    customer_id: ''
  })

  useEffect(() => {
    if (isOpen && initialCredentials) {
      setCredentials({
        developer_token: initialCredentials.developer_token || '',
        client_id: initialCredentials.client_id || '',
        client_secret: initialCredentials.client_secret || '',
        refresh_token: initialCredentials.refresh_token || '',
        customer_id: initialCredentials.customer_id || ''
      })
    } else if (isOpen) {
      setCredentials({
        developer_token: '',
        client_id: '',
        client_secret: '',
        refresh_token: '',
        customer_id: ''
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
        google_ads_developer_token: credentials.developer_token || undefined,
        google_ads_client_id: credentials.client_id || undefined,
        google_ads_client_secret: credentials.client_secret || undefined,
        google_ads_refresh_token: credentials.refresh_token || undefined,
        google_ads_customer_id: credentials.customer_id || undefined,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to save credentials')
      }

      toastSuccess('Google Ads credentials saved successfully')
      onSaved()
      onClose()
    } catch (error) {
      console.error('Error saving Google Ads credentials:', error)
      toastError(error instanceof Error ? error.message : 'Failed to save credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Google Ads API Credentials</DialogTitle>
          <DialogDescription>
            Enter your Google Ads API credentials. All sensitive fields are encrypted before storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="developer_token">
              Developer Token <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="developer_token"
                type={showSecrets.developer_token ? 'text' : 'password'}
                value={credentials.developer_token}
                onChange={(e) => setCredentials({ ...credentials, developer_token: e.target.value })}
                placeholder="Enter developer token"
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('developer_token')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.developer_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Unique token that identifies your application to Google Ads API
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_id">
              Client ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client_id"
              type="text"
              value={credentials.client_id}
              onChange={(e) => setCredentials({ ...credentials, client_id: e.target.value })}
              placeholder="xxxxx.apps.googleusercontent.com"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              OAuth 2.0 Client ID from Google Cloud Console
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_secret">
              Client Secret <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="client_secret"
                type={showSecrets.client_secret ? 'text' : 'password'}
                value={credentials.client_secret}
                onChange={(e) => setCredentials({ ...credentials, client_secret: e.target.value })}
                placeholder="GOCSPX-xxxxxxxxxxxxx"
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('client_secret')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.client_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              OAuth 2.0 Client Secret from Google Cloud Console
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refresh_token">
              Refresh Token <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="refresh_token"
                type={showSecrets.refresh_token ? 'text' : 'password'}
                value={credentials.refresh_token}
                onChange={(e) => setCredentials({ ...credentials, refresh_token: e.target.value })}
                placeholder="Enter refresh token"
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('refresh_token')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.refresh_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Used to obtain new access tokens without user interaction
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer ID (Optional)</Label>
            <Input
              id="customer_id"
              type="text"
              value={credentials.customer_id}
              onChange={(e) => setCredentials({ ...credentials, customer_id: e.target.value })}
              placeholder="123-456-7890 or 1234567890"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Google Ads account ID (can be set per account if managing multiple)
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
            disabled={loading || !credentials.developer_token || !credentials.client_id || !credentials.client_secret || !credentials.refresh_token}
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

