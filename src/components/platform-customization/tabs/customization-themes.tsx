"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Moon, Sun, Monitor } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

export function CustomizationThemes() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto')
  const [customCSS, setCustomCSS] = useState('')

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
        .select('theme_mode, custom_css')
        .eq('space_id', spaceId)
        .single()

      if (!error && data) {
        setThemeMode(data.theme_mode || 'auto')
        setCustomCSS(data.custom_css || '')
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
          theme_mode: themeMode,
          custom_css: customCSS || null,
        })

      if (error) throw error

      toastSuccess('Theme settings saved successfully')
    } catch (error) {
      console.error('Save error:', error)
      toastError('Failed to save theme settings')
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
        <h1 className="text-3xl font-bold">Theme Builder</h1>
        <p className="text-muted-foreground mt-2">
          Customize light/dark modes and add custom CSS
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme Mode</CardTitle>
          <CardDescription>Choose the default theme mode for your space</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setThemeMode('light')}
              className={`p-4 border-2 rounded-lg transition-all ${
                themeMode === 'light'
                  ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/30'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Sun className="w-8 h-8 mx-auto mb-2" />
              <div className="font-medium">Light</div>
            </button>
            <button
              onClick={() => setThemeMode('dark')}
              className={`p-4 border-2 rounded-lg transition-all ${
                themeMode === 'dark'
                  ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/30'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Moon className="w-8 h-8 mx-auto mb-2" />
              <div className="font-medium">Dark</div>
            </button>
            <button
              onClick={() => setThemeMode('auto')}
              className={`p-4 border-2 rounded-lg transition-all ${
                themeMode === 'auto'
                  ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/30'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Monitor className="w-8 h-8 mx-auto mb-2" />
              <div className="font-medium">Auto</div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom CSS</CardTitle>
          <CardDescription>Add custom CSS to override default styles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="custom-css">CSS Code</Label>
            <Textarea
              id="custom-css"
              value={customCSS}
              onChange={(e) => setCustomCSS(e.target.value)}
              placeholder=":root {&#10;  --primary: #6366f1;&#10;  --secondary: #8b5cf6;&#10;}"
              className="font-mono text-sm"
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              Use CSS variables or direct selectors to customize the appearance
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

