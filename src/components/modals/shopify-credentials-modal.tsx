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

interface ShopifyCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  companyId: string
  initialCredentials?: {
    store_domain?: string
    api_key?: string
    api_secret_key?: string
    access_token?: string
    scopes?: string
  }
}

export function ShopifyCredentialsModal({
  isOpen,
  onClose,
  onSaved,
  companyId,
  initialCredentials
}: ShopifyCredentialsModalProps) {
  const [loading, setLoading] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  
  const [credentials, setCredentials] = useState({
    store_domain: '',
    api_key: '',
    api_secret_key: '',
    access_token: '',
    scopes: ''
  })

  useEffect(() => {
    if (isOpen && initialCredentials) {
      setCredentials({
        store_domain: initialCredentials.store_domain || '',
        api_key: initialCredentials.api_key || '',
        api_secret_key: initialCredentials.api_secret_key || '',
        access_token: initialCredentials.access_token || '',
        scopes: initialCredentials.scopes || ''
      })
    } else if (isOpen) {
      setCredentials({
        store_domain: '',
        api_key: '',
        api_secret_key: '',
        access_token: '',
        scopes: ''
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
        shopify_store_domain: credentials.store_domain || undefined,
        shopify_api_key: credentials.api_key || undefined,
        shopify_api_secret_key: credentials.api_secret_key || undefined,
        shopify_access_token: credentials.access_token || undefined,
        shopify_scopes: credentials.scopes || undefined,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to save credentials')
      }

      toastSuccess('Shopify credentials saved successfully')
      onSaved()
      onClose()
    } catch (error) {
      console.error('Error saving Shopify credentials:', error)
      toastError(error instanceof Error ? error.message : 'Failed to save credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shopify API Credentials</DialogTitle>
          <DialogDescription>
            Enter your Shopify API credentials. All sensitive fields are encrypted before storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store_domain">
              Store Domain <span className="text-destructive">*</span>
            </Label>
            <Input
              id="store_domain"
              type="text"
              value={credentials.store_domain}
              onChange={(e) => setCredentials({ ...credentials, store_domain: e.target.value })}
              placeholder="your-store.myshopify.com"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Your Shopify store domain (without https://)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_key">
              API Key <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showSecrets.api_key ? 'text' : 'password'}
                value={credentials.api_key}
                onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
                placeholder="Enter API key"
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('api_key')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.api_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Admin API Key from Private App or OAuth App
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_secret_key">
              API Secret Key <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="api_secret_key"
                type={showSecrets.api_secret_key ? 'text' : 'password'}
                value={credentials.api_secret_key}
                onChange={(e) => setCredentials({ ...credentials, api_secret_key: e.target.value })}
                placeholder="Enter API secret key"
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => toggleShowSecret('api_secret_key')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecrets.api_secret_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Admin API Secret Key from Private App or OAuth App
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
                placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
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
              Admin API Access Token (shpat_ for Private Apps, shpca_ for OAuth Apps)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scopes">Scopes (Optional)</Label>
            <Input
              id="scopes"
              type="text"
              value={credentials.scopes}
              onChange={(e) => setCredentials({ ...credentials, scopes: e.target.value })}
              placeholder="read_products,write_products,read_orders"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of API scopes/permissions (for OAuth apps)
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
            disabled={loading || !credentials.store_domain || !credentials.api_key || !credentials.api_secret_key || !credentials.access_token}
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

