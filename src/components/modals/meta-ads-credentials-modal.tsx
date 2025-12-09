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
import { updateSpace } from '@/lib/database-functions'

interface MetaAdsCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  companyId: string
  initialCredentials?: {
    app_id?: string
    app_secret?: string
    access_token?: string
    ad_account_id?: string
    system_user_token?: string
  }
}

export function MetaAdsCredentialsModal({
  isOpen,
  onClose,
  onSaved,
  companyId,
  initialCredentials
}: MetaAdsCredentialsModalProps) {
  const [loading, setLoading] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  
  const [credentials, setCredentials] = useState({
    app_id: '',
    app_secret: '',
    access_token: '',
    ad_account_id: '',
    system_user_token: ''
  })

  useEffect(() => {
    if (isOpen && initialCredentials) {
      setCredentials({
        app_id: initialCredentials.app_id || '',
        app_secret: initialCredentials.app_secret || '',
        access_token: initialCredentials.access_token || '',
        ad_account_id: initialCredentials.ad_account_id || '',
        system_user_token: initialCredentials.system_user_token || ''
      })
    } else if (isOpen) {
      setCredentials({
        app_id: '',
        app_secret: '',
        access_token: '',
        ad_account_id: '',
        system_user_token: ''
      })
    }
  }, [isOpen, initialCredentials])

  const toggleShowSecret = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const result = await updateSpace(companyId, {
        meta_ads_app_id: credentials.app_id || undefined,
        meta_ads_app_secret: credentials.app_secret || undefined,
        meta_ads_access_token: credentials.access_token || undefined,
        meta_ads_ad_account_id: credentials.ad_account_id || undefined,
        meta_ads_system_user_token: credentials.system_user_token || undefined,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to save credentials')
      }

      toastSuccess('Meta Ads credentials saved successfully')
      onSaved()
      onClose()
    } catch (error) {
      console.error('Error saving Meta Ads credentials:', error)
      toastError(error instanceof Error ? error.message : 'Failed to save credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meta Ads API Credentials</DialogTitle>
          <DialogDescription>
            Enter your Meta (Facebook/Instagram) Ads API credentials. All sensitive fields are encrypted before storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app_id">
              App ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="app_id"
              type="text"
              value={credentials.app_id}
              onChange={(e) => setCredentials({ ...credentials, app_id: e.target.value })}
              placeholder="123456789012345"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Application ID from Meta for Developers portal
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app_secret">
              App Secret <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="app_secret"
                type={showSecrets.app_secret ? 'text' : 'password'}
                value={credentials.app_secret}
                onChange={(e) => setCredentials({ ...credentials, app_secret: e.target.value })}
                placeholder="Enter app secret"
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('app_secret')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.app_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Application Secret from Meta for Developers portal
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="access_token">
              Access Token <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="access_token"
                type={showSecrets.access_token ? 'text' : 'password'}
                value={credentials.access_token}
                onChange={(e) => setCredentials({ ...credentials, access_token: e.target.value })}
                placeholder="Enter access token"
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('access_token')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.access_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Access token (can be short-lived or long-lived, 60 days max)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ad_account_id">Ad Account ID (Optional)</Label>
            <Input
              id="ad_account_id"
              type="text"
              value={credentials.ad_account_id}
              onChange={(e) => setCredentials({ ...credentials, ad_account_id: e.target.value })}
              placeholder="act_123456789 or 123456789"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Meta Ad Account ID (can be set per account if managing multiple)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_user_token">System User Token (Optional, Recommended)</Label>
            <div className="relative">
              <Input
                id="system_user_token"
                type={showSecrets.system_user_token ? 'text' : 'password'}
                value={credentials.system_user_token}
                onChange={(e) => setCredentials({ ...credentials, system_user_token: e.target.value })}
                placeholder="Enter system user token"
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('system_user_token')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.system_user_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              System User Access Token for server-to-server calls (more stable than user tokens)
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
            disabled={loading || !credentials.app_id || !credentials.app_secret || !credentials.access_token}
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

