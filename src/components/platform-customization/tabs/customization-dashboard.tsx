"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Palette, 
  Paintbrush, 
  Layout, 
  Globe, 
  Mail, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/components/providers/session-provider'
import { toastError } from '@/lib/toast'

interface CustomizationStatus {
  branding: boolean
  themes: boolean
  layout: boolean
  whiteLabel: boolean
  email: boolean
}

export function CustomizationDashboard() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [customization, setCustomization] = useState<any>(null)
  const [status, setStatus] = useState<CustomizationStatus>({
    branding: false,
    themes: false,
    layout: false,
    whiteLabel: false,
    email: false,
  })
  const [hasLoaded, setHasLoaded] = useState(false)

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
      // Get user's space_id
      const { data: userData } = await supabase
        .from('users')
        .select('space_id, company_id')
        .eq('id', session.user.id)
        .single()

      const spaceId = userData?.space_id || userData?.company_id
      if (!spaceId) {
        setLoading(false)
        setHasLoaded(true)
        return
      }

      // Load customization
      const { data, error } = await supabase
        .from('space_customizations')
        .select('*')
        .eq('space_id', spaceId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading customization:', error)
        toastError('Failed to load customization settings')
      } else {
        setCustomization(data || null)
        
        // Calculate status
        if (data) {
          setStatus({
            branding: !!(data.logo_url || data.primary_color),
            themes: !!(data.custom_theme && Object.keys(data.custom_theme).length > 0) || !!data.custom_css,
            layout: !!(data.layout_config && Object.keys(data.layout_config).length > 0),
            whiteLabel: !!(data.custom_domain || data.hide_parrot_branding),
            email: !!(data.email_template_config && Object.keys(data.email_template_config).length > 0),
          })
        } else {
          // No customization data, all statuses remain false
          setStatus({
            branding: false,
            themes: false,
            layout: false,
            whiteLabel: false,
            email: false,
          })
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toastError('Failed to load customization settings')
    } finally {
      setLoading(false)
      setHasLoaded(true)
    }
  }

  const sections = [
    {
      id: 'branding',
      title: 'Branding & Identity',
      description: 'Logos, colors, and fonts',
      icon: Palette,
      status: status.branding,
      href: '/apps/platform-customization?tab=branding',
    },
    {
      id: 'themes',
      title: 'Theme Builder',
      description: 'Light/dark modes and custom themes',
      icon: Paintbrush,
      status: status.themes,
      href: '/apps/platform-customization?tab=themes',
    },
    {
      id: 'layout',
      title: 'Layout Customization',
      description: 'Sidebar, navigation, and dashboard',
      icon: Layout,
      status: status.layout,
      href: '/apps/platform-customization?tab=layout',
    },
    {
      id: 'white-label',
      title: 'White-Label Options',
      description: 'Custom domain and branding removal',
      icon: Globe,
      status: status.whiteLabel,
      href: '/apps/platform-customization?tab=white-label',
    },
    {
      id: 'email',
      title: 'Email Branding',
      description: 'Email templates and signatures',
      icon: Mail,
      status: status.email,
      href: '/apps/platform-customization?tab=email',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
      </div>
    )
  }

  const completedCount = Object.values(status).filter(Boolean).length
  const totalCount = Object.keys(status).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Platform Customization</h1>
        <p className="text-muted-foreground mt-2">
          Customize branding, themes, and white-label settings for your space
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Customization Progress</CardTitle>
          <CardDescription>
            {completedCount} of {totalCount} sections configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{Math.round((completedCount / totalCount) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-fuchsia-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card 
              key={section.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => window.location.href = section.href}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/30">
                    <Icon className="w-5 h-5 text-fuchsia-600" />
                  </div>
                  {section.status ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Not Set
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-4">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" size="sm">
                  {section.status ? 'Edit' : 'Configure'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            See how your customizations look before applying them
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.location.href = '/apps/platform-customization?tab=preview'}
            className="w-full"
          >
            Open Preview
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

