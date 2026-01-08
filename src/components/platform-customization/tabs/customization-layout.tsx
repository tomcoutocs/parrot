"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, PanelLeft, PanelRight, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

export function CustomizationLayout() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right' | 'hidden'>('left')
  const [sidebarWidth, setSidebarWidth] = useState('240px')
  const [headerHeight, setHeaderHeight] = useState('64px')

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
        .select('sidebar_position, sidebar_width, header_height, layout_config')
        .eq('space_id', spaceId)
        .single()

      if (!error && data) {
        setSidebarPosition(data.sidebar_position || 'left')
        setSidebarWidth(data.sidebar_width || '240px')
        setHeaderHeight(data.header_height || '64px')
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
          sidebar_position: sidebarPosition,
          sidebar_width: sidebarWidth,
          header_height: headerHeight,
        })

      if (error) throw error

      toastSuccess('Layout settings saved successfully')
    } catch (error) {
      console.error('Save error:', error)
      toastError('Failed to save layout settings')
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
        <h1 className="text-3xl font-bold">Layout Customization</h1>
        <p className="text-muted-foreground mt-2">
          Customize sidebar position, navigation, and dashboard layout
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sidebar Position</CardTitle>
          <CardDescription>Choose where the sidebar appears</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setSidebarPosition('left')}
              className={`p-4 border-2 rounded-lg transition-all ${
                sidebarPosition === 'left'
                  ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/30'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <PanelLeft className="w-8 h-8 mx-auto mb-2" />
              <div className="font-medium">Left</div>
            </button>
            <button
              onClick={() => setSidebarPosition('right')}
              className={`p-4 border-2 rounded-lg transition-all ${
                sidebarPosition === 'right'
                  ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/30'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <PanelRight className="w-8 h-8 mx-auto mb-2" />
              <div className="font-medium">Right</div>
            </button>
            <button
              onClick={() => setSidebarPosition('hidden')}
              className={`p-4 border-2 rounded-lg transition-all ${
                sidebarPosition === 'hidden'
                  ? 'border-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/30'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <EyeOff className="w-8 h-8 mx-auto mb-2" />
              <div className="font-medium">Hidden</div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dimensions</CardTitle>
          <CardDescription>Customize sidebar and header sizes</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sidebar-width">Sidebar Width</Label>
            <input
              id="sidebar-width"
              type="text"
              value={sidebarWidth}
              onChange={(e) => setSidebarWidth(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="240px"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="header-height">Header Height</Label>
            <input
              id="header-height"
              type="text"
              value={headerHeight}
              onChange={(e) => setHeaderHeight(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="64px"
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

