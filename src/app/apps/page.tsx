"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSession, useAuth } from '@/components/providers/session-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Briefcase, 
  Users, 
  FileText, 
  DollarSign, 
  Settings, 
  HelpCircle,
  ArrowRight,
  Loader2,
  LogOut,
  User,
  ChevronDown,
  UserCog,
  BarChart3
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fetchForms } from '@/lib/database-functions'
import { Form, supabase } from '@/lib/supabase'
import UserSettingsTab from '@/components/tabs/user-settings-tab'
import { NotificationBell } from '@/components/notifications/notification-bell'

export default function AppsPage() {
  const { data: session, status } = useSession()
  const auth = useAuth()
  const router = useRouter()
  const [showSettings, setShowSettings] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [supportForm, setSupportForm] = useState<Form | null>(null)
  const [loadingSupportForm, setLoadingSupportForm] = useState(false)
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null)

  const handleSignOut = () => {
    auth.signOut()
    router.push('/auth/signin')
  }

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Load user profile picture
  useEffect(() => {
    if (!session?.user?.id) return

    const loadUserProfilePicture = async () => {
      if (!supabase) return
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('profile_picture')
          .eq('id', session.user.id)
          .single()
        
        if (!error && data?.profile_picture) {
          // Add cache-busting parameter to ensure fresh image
          const url = data.profile_picture
          const urlWithCacheBust = url.includes('?') 
            ? `${url}&t=${Date.now()}` 
            : `${url}?t=${Date.now()}`
          setUserProfilePicture(urlWithCacheBust)
        }
      } catch (error) {
        console.error('Error loading user profile picture:', error)
      }
    }
    
    loadUserProfilePicture()

    // Listen for profile picture updates
    const handleProfilePictureUpdate = (event: CustomEvent) => {
      if (event.detail?.userId === session?.user?.id) {
        setUserProfilePicture(event.detail.url)
      }
    }

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener)
    
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener)
    }
  }, [session?.user?.id])

  const handleOpenSupport = async () => {
    setLoadingSupportForm(true)
    try {
      const forms = await fetchForms()
      const supportTicketForm = forms.find(form => {
        const title = form.title.toLowerCase().trim()
        return title === 'support ticket' || 
               title === 'support' ||
               title.includes('support ticket') ||
               title.includes('support')
      })
      if (supportTicketForm) {
        setSupportForm(supportTicketForm)
        setShowSupportModal(true)
      } else {
        // If no support form found, show a simple contact form
        setShowSupportModal(true)
      }
    } catch (error) {
      console.error('Error loading support form:', error)
      setShowSupportModal(true)
    } finally {
      setLoadingSupportForm(false)
    }
  }

  const allApps = [
    {
      id: 'lead-generation',
      name: 'Lead Generation',
      description: 'Manage and track your leads, campaigns, and conversions',
      icon: Users,
      color: 'text-blue-400 dark:text-blue-500',
      bgColor: 'bg-blue-50/50 dark:bg-blue-950/30',
      hoverShadow: 'hover:shadow-[0_4px_12px_rgba(59,130,246,0.12)] dark:hover:shadow-[0_4px_12px_rgba(59,130,246,0.18)]',
      available: true,
      adminOnly: true, // Only admins can access this app
    },
    {
      id: 'crm',
      name: 'Customer Relation Management',
      description: 'Build stronger relationships with your customers',
      icon: Briefcase,
      color: 'text-emerald-400 dark:text-emerald-500',
      bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/30',
      hoverShadow: 'hover:shadow-[0_4px_12px_rgba(16,185,129,0.12)] dark:hover:shadow-[0_4px_12px_rgba(16,185,129,0.18)]',
      available: true,
      adminOnly: true, // Only admins can access this app
    },
    {
      id: 'client-portal',
      name: 'Client Portal',
      description: 'Access your projects, tasks, documents, and more',
      icon: FileText,
      color: 'text-violet-400 dark:text-violet-500',
      bgColor: 'bg-violet-50/50 dark:bg-violet-950/30',
      hoverShadow: 'hover:shadow-[0_4px_12px_rgba(139,92,246,0.12)] dark:hover:shadow-[0_4px_12px_rgba(139,92,246,0.18)]',
      available: true,
    },
    {
      id: 'invoicing',
      name: 'Invoicing & Billing',
      description: 'Create invoices, track payments, and manage billing',
      icon: DollarSign,
      color: 'text-amber-400 dark:text-amber-500',
      bgColor: 'bg-amber-50/50 dark:bg-amber-950/30',
      hoverShadow: 'hover:shadow-[0_4px_12px_rgba(245,158,11,0.12)] dark:hover:shadow-[0_4px_12px_rgba(245,158,11,0.18)]',
      available: true,
      adminOnly: true, // Only admins can access this app
    },
    {
      id: 'user-management',
      name: 'User Management',
      description: 'Manage users, roles, permissions, and access controls',
      icon: UserCog,
      color: 'text-indigo-400 dark:text-indigo-500',
      bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/30',
      hoverShadow: 'hover:shadow-[0_4px_12px_rgba(99,102,241,0.12)] dark:hover:shadow-[0_4px_12px_rgba(99,102,241,0.18)]',
      available: true,
      adminOnly: true, // Only admins can access this app
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'View insights, reports, and data visualizations',
      icon: BarChart3,
      color: 'text-rose-400 dark:text-rose-500',
      bgColor: 'bg-rose-50/50 dark:bg-rose-950/30',
      hoverShadow: 'hover:shadow-[0_4px_12px_rgba(244,63,94,0.12)] dark:hover:shadow-[0_4px_12px_rgba(244,63,94,0.18)]',
      available: true,
      adminOnly: true, // Only admins can access this app
    },
  ]

  // Set availability based on user role - admin-only apps are unavailable for non-admins
  const apps = allApps.map(app => {
    if (app.adminOnly && session?.user?.role !== 'admin') {
      return { ...app, available: false }
    }
    return app
  })

  const handleAppClick = (appId: string) => {
    if (appId === 'client-portal') {
      // Redirect to the current dashboard
      if (session?.user?.role === 'admin') {
        router.push('/dashboard')
      } else {
        router.push('/dashboard?tab=user-dashboard')
      }
    } else if (appId === 'crm' || appId === 'lead-generation' || appId === 'invoicing' || appId === 'user-management' || appId === 'analytics') {
      // Admin-only apps - check role before allowing access
      if (session?.user?.role !== 'admin') {
        return // Don't navigate if not admin
      }
      router.push(`/apps/${appId}`)
    } else {
      // For placeholder apps, show coming soon message
      router.push(`/apps/${appId}`)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/parrot-grad-main.png"
                alt="Parrot Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <h1 className="text-xl font-bold">Parrot Platform</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={handleOpenSupport}
                disabled={loadingSupportForm}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                title="Support"
              >
                {loadingSupportForm ? (
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:bg-muted px-2 py-1 -mx-2 rounded-md transition-colors">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={userProfilePicture || undefined} />
                      <AvatarFallback className="bg-muted text-xs">
                        {session?.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{session?.user?.name || 'User'}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    <span>User Settings</span>
                  </DropdownMenuItem>
                  <div className="w-px h-px bg-border mx-2 my-1" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              Welcome back, {session?.user?.name || 'User'}!
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose an app to get started
            </p>
          </div>

          {/* App Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => {
              const Icon = app.icon
              return (
                <Card
                  key={app.id}
                  className={`flex flex-col h-full cursor-pointer transition-all duration-300 border-border/50 hover:scale-[1.01] ${
                    app.available
                      ? `${app.hoverShadow}`
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => app.available && handleAppClick(app.id)}
                >
                  <CardHeader className="flex-shrink-0">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg transition-colors duration-300 ${app.bgColor}`}>
                        <Icon className={`w-8 h-8 ${app.color}`} />
                      </div>
                      {!app.available && (
                        <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <CardTitle className="mt-4">{app.name}</CardTitle>
                    <CardDescription>{app.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto flex-shrink-0">
                    <Button
                      variant={app.available ? 'default' : 'outline'}
                      className="w-full gap-2"
                      disabled={!app.available}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (app.available) {
                          handleAppClick(app.id)
                        }
                      }}
                    >
                      {app.available ? (
                        <>
                          Open App
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        'Coming Soon'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Settings</DialogTitle>
            <DialogDescription>
              Manage your account preferences and settings
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <UserSettingsTab />
          </div>
        </DialogContent>
      </Dialog>

      {/* Support Modal */}
      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Support Ticket</DialogTitle>
            <DialogDescription>
              {supportForm
                ? supportForm.description || 'Submit a support ticket and we\'ll get back to you soon.'
                : 'Submit a support ticket and we\'ll get back to you soon.'}
            </DialogDescription>
          </DialogHeader>
          {supportForm ? (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Support form functionality will be integrated here. For now, please contact support directly.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Your Email</label>
                  <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Form: {supportForm.title}</label>
                  <p className="text-sm text-muted-foreground">
                    This form will be rendered here in a future update.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Please contact support at{' '}
                <a href="mailto:support@parrot.com" className="text-primary hover:underline">
                  support@parrot.com
                </a>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

