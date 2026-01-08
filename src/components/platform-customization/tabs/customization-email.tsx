"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

export function CustomizationEmail() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [emailSignature, setEmailSignature] = useState('')
  const [emailHeaderColor, setEmailHeaderColor] = useState('#6366f1')
  const [emailFooterText, setEmailFooterText] = useState('')

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
        .select('email_signature, email_header_color, email_footer_text')
        .eq('space_id', spaceId)
        .single()

      if (!error && data) {
        setEmailSignature(data.email_signature || '')
        setEmailHeaderColor(data.email_header_color || '#6366f1')
        setEmailFooterText(data.email_footer_text || '')
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
          email_signature: emailSignature || null,
          email_header_color: emailHeaderColor,
          email_footer_text: emailFooterText || null,
        })

      if (error) throw error

      toastSuccess('Email branding settings saved successfully')
    } catch (error) {
      console.error('Save error:', error)
      toastError('Failed to save email branding settings')
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
        <h1 className="text-3xl font-bold">Email Branding</h1>
        <p className="text-muted-foreground mt-2">
          Customize email templates, signatures, and communication branding
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Signature
          </CardTitle>
          <CardDescription>
            Set a default email signature for all outgoing emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="email-signature">Signature HTML</Label>
            <Textarea
              id="email-signature"
              value={emailSignature}
              onChange={(e) => setEmailSignature(e.target.value)}
              placeholder="Best regards,&#10;Your Name&#10;Your Company"
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              HTML is supported for rich formatting
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Template Colors</CardTitle>
          <CardDescription>
            Customize the header color for email templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="email-header-color">Header Color</Label>
            <div className="flex gap-2">
              <input
                id="email-header-color"
                type="color"
                value={emailHeaderColor}
                onChange={(e) => setEmailHeaderColor(e.target.value)}
                className="w-20 h-10 rounded border"
              />
              <Input
                type="text"
                value={emailHeaderColor}
                onChange={(e) => setEmailHeaderColor(e.target.value)}
                placeholder="#6366f1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Footer</CardTitle>
          <CardDescription>
            Add custom footer text to all emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="email-footer">Footer Text</Label>
            <Textarea
              id="email-footer"
              value={emailFooterText}
              onChange={(e) => setEmailFooterText(e.target.value)}
              placeholder="© 2024 Your Company. All rights reserved."
              rows={3}
            />
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

