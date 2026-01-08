"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Globe, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

export function CustomizationWhiteLabel() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [customDomain, setCustomDomain] = useState('')
  const [hideParrotBranding, setHideParrotBranding] = useState(false)
  const [customAppName, setCustomAppName] = useState('')

  useEffect(() => {
    // Only load if we have a session and haven't loaded yet
    if (session?.user?.id && !hasLoaded && supabase) {
      loadCustomization()
    } else if (!session?.user?.id) {
      setLoading(false)
    }
  }, [session?.user?.id, hasLoaded])

  const loadCustomization = async () => {
    if (!session?.user?.id || !supabase || hasLoaded) return
    
    setLoading(true)
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('space_id, company_id')
        .eq('id', session.user.id)
        .single()

      const spaceId = userData?.space_id || userData?.company_id
      if (!spaceId) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('space_customizations')
        .select('custom_domain, hide_parrot_branding, custom_app_name')
        .eq('space_id', spaceId)
        .single()

      if (!error && data) {
        setCustomDomain(data.custom_domain || '')
        setHideParrotBranding(data.hide_parrot_branding || false)
        setCustomAppName(data.custom_app_name || '')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
      setHasLoaded(true)
    }
  }

  const handleSave = async () => {
    if (!session?.user?.id || !supabase) return

    setSaving(true)
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('space_id, company_id')
        .eq('id', session.user.id)
        .single()

      const spaceId = userData?.space_id || userData?.company_id
      if (!spaceId) {
        toastError('Space ID not found')
        return
      }

      const { error } = await supabase
        .from('space_customizations')
        .upsert({
          space_id: spaceId,
          custom_domain: customDomain || null,
          hide_parrot_branding: hideParrotBranding,
          custom_app_name: customAppName || null,
        })

      if (error) throw error

      toastSuccess('White-label settings saved successfully')
    } catch (error) {
      console.error('Save error:', error)
      toastError('Failed to save white-label settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">White-Label Options</h1>
        <p className="text-muted-foreground mt-2">
          Customize domain, branding removal, and app name
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Custom Domain
          </CardTitle>
          <CardDescription>
            Set up a custom domain for your space (requires DNS configuration)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-domain">Domain Name</Label>
            <Input
              id="custom-domain"
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="app.yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Contact support to configure DNS settings for your custom domain
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Branding Options
          </CardTitle>
          <CardDescription>
            Control platform branding visibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hide-branding"
              checked={hideParrotBranding}
              onCheckedChange={(checked) => setHideParrotBranding(checked === true)}
            />
            <Label htmlFor="hide-branding" className="cursor-pointer">
              Hide Parrot Platform branding
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-app-name">Custom App Name</Label>
            <Input
              id="custom-app-name"
              type="text"
              value={customAppName}
              onChange={(e) => setCustomAppName(e.target.value)}
              placeholder="Your Company Platform"
            />
            <p className="text-xs text-muted-foreground">
              Replace "Parrot Platform" with your custom name throughout the interface
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadCustomization}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  )
}

