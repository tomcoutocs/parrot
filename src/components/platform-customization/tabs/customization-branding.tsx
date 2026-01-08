"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

export function CustomizationBranding() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customization, setCustomization] = useState<any>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  
  // Form state
  const [logoUrl, setLogoUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#6366f1')
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6')
  const [accentColor, setAccentColor] = useState('#ec4899')
  const [fontFamily, setFontFamily] = useState('Inter')
  const [fontSizeBase, setFontSizeBase] = useState('16px')

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
        .select('*')
        .eq('space_id', spaceId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading customization:', error)
      } else if (data) {
        setCustomization(data)
        setLogoUrl(data.logo_url || '')
        setFaviconUrl(data.favicon_url || '')
        setPrimaryColor(data.primary_color || '#6366f1')
        setSecondaryColor(data.secondary_color || '#8b5cf6')
        setAccentColor(data.accent_color || '#ec4899')
        setFontFamily(data.font_family || 'Inter')
        setFontSizeBase(data.font_size_base || '16px')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
      setHasLoaded(true)
    }
  }

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    if (!session?.user?.id || !supabase) return

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('space_id, company_id')
        .eq('id', session.user.id)
        .single()

      const spaceId = userData?.space_id || userData?.company_id
      if (!spaceId) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${spaceId}/${type}-${Date.now()}.${fileExt}`
      const filePath = `customizations/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      if (type === 'logo') {
        setLogoUrl(publicUrl)
      } else {
        setFaviconUrl(publicUrl)
      }

      toastSuccess(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`)
    } catch (error) {
      console.error('Upload error:', error)
      toastError(`Failed to upload ${type === 'logo' ? 'logo' : 'favicon'}`)
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

      const customizationData = {
        space_id: spaceId,
        logo_url: logoUrl || null,
        favicon_url: faviconUrl || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        font_family: fontFamily,
        font_size_base: fontSizeBase,
      }

      if (customization) {
        // Update existing
        const { error } = await supabase
          .from('space_customizations')
          .update(customizationData)
          .eq('space_id', spaceId)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('space_customizations')
          .insert(customizationData)

        if (error) throw error
      }

      toastSuccess('Branding settings saved successfully')
      await loadCustomization()
    } catch (error) {
      console.error('Save error:', error)
      toastError('Failed to save branding settings')
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
        <h1 className="text-3xl font-bold">Branding & Identity</h1>
        <p className="text-muted-foreground mt-2">
          Customize your logo, colors, and typography
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>Upload your company logo (PNG, SVG, or JPG)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoUrl && (
              <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-muted">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setLogoUrl('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div>
              <Label htmlFor="logo-upload">Upload Logo</Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file, 'logo')
                }}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Favicon Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Favicon</CardTitle>
            <CardDescription>Upload a favicon (16x16 or 32x32 PNG)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {faviconUrl && (
              <div className="relative w-16 h-16 border rounded-lg overflow-hidden bg-muted">
                <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1"
                  onClick={() => setFaviconUrl('')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            <div>
              <Label htmlFor="favicon-upload">Upload Favicon</Label>
              <Input
                id="favicon-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file, 'favicon')
                }}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Set your brand colors</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#6366f1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#8b5cf6"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent-color"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#ec4899"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Customize fonts and sizes</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="font-family">Font Family</Label>
              <select
                id="font-family"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Poppins">Poppins</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="font-size">Base Font Size</Label>
              <Input
                id="font-size"
                type="text"
                value={fontSizeBase}
                onChange={(e) => setFontSizeBase(e.target.value)}
                placeholder="16px"
              />
            </div>
          </CardContent>
        </Card>
      </div>

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

