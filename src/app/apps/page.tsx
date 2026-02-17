"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSession, useAuth } from '@/components/providers/session-provider'
import { 
  Briefcase, 
  Users, 
  FileText, 
  DollarSign, 
  HelpCircle,
  ArrowRight,
  Loader2,
  LogOut,
  User,
  ChevronDown,
  UserCog,
  BarChart3,
  Shield,
  Zap,
  Palette
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase'
import UserSettingsTab from '@/components/tabs/user-settings-tab'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { SupportTicketModal } from '@/components/modals/support-ticket-modal'
import { hasSystemAdminPrivileges, hasAdminPrivileges, canAccessApp } from '@/lib/role-helpers'
import { toastError } from '@/lib/toast'

export default function AppsPage() {
  const { data: session, status } = useSession()
  const auth = useAuth()
  const router = useRouter()
  const [showSettings, setShowSettings] = useState(false)
  const [showSupportTicketModal, setShowSupportTicketModal] = useState(false)
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null)

  const handleSignOut = () => {
    auth.signOut()
    router.push('/auth/signin')
  }

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/auth/signin')
      return
    }
    // Don't redirect system admins - they can access platform apps if they navigate here directly
    // The choice page is only shown after login
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


  const allApps = [
    {
      id: 'lead-generation',
      name: 'Lead Generation',
      description: 'Manage and track your leads, campaigns, and conversions',
      icon: Users,
      color: 'text-[#63a4ba] dark:text-[#63a4ba]',
      glassGlow: '99,164,186',
      available: true,
      adminOnly: true,
    },
    {
      id: 'crm',
      name: 'Customer Relation Management',
      description: 'Build stronger relationships with your customers',
      icon: Briefcase,
      color: 'text-[#63a4ba] dark:text-[#63a4ba]',
      glassGlow: '99,164,186',
      available: true,
      adminOnly: true,
    },
    {
      id: 'client-portal',
      name: 'Client Portal',
      description: 'Access your projects, tasks, documents, and more',
      icon: FileText,
      color: 'text-[#63a4ba] dark:text-[#63a4ba]',
      glassGlow: '99,164,186',
      available: true,
    },
    {
      id: 'invoicing',
      name: 'Invoicing & Billing',
      description: 'Create invoices, track payments, and manage billing',
      icon: DollarSign,
      color: 'text-[#63a4ba] dark:text-[#63a4ba]',
      glassGlow: '99,164,186',
      available: true,
      adminOnly: true,
    },
    {
      id: 'user-management',
      name: 'User Management',
      description: 'Manage users, roles, permissions, and access controls',
      icon: UserCog,
      color: 'text-[#63a4ba] dark:text-[#63a4ba]',
      glassGlow: '99,164,186',
      available: true,
      adminOnly: true,
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'View insights, reports, and data visualizations',
      icon: BarChart3,
      color: 'text-[#63a4ba] dark:text-[#63a4ba]',
      glassGlow: '99,164,186',
      available: true,
      adminOnly: true,
    },
    {
      id: 'automations',
      name: 'Automations',
      description: 'Build custom automation workflows and pipelines',
      icon: Zap,
      color: 'text-[#63a4ba] dark:text-[#63a4ba]',
      glassGlow: '99,164,186',
      available: true,
      adminOnly: true,
    },
    {
      id: 'platform-customization',
      name: 'Platform Customization',
      description: 'Customize branding, themes, and white-label settings for your space',
      icon: Palette,
      color: 'text-[#63a4ba] dark:text-[#63a4ba]',
      glassGlow: '99,164,186',
      available: true,
      adminOnly: true,
    },
  ]

  // Check if user has permission for an app (has at least one tab permission)
  const hasAppPermission = (appId: string): boolean => {
    if (!session?.user) return false
    
    const userRole = session.user.role
    const tabPermissions = session.user.tab_permissions || []
    
    // Use the centralized canAccessApp function
    return canAccessApp(appId, userRole, tabPermissions)
  }

  // Set availability based on user role and permissions
  const apps = allApps.map(app => {
    const userRole = session?.user?.role as string | undefined
    
    // Regular users (clients) can only access Client Portal
    if (userRole === 'user') {
      if (app.id === 'client-portal') {
        return app
      }
      return { ...app, available: false }
    }
    
    // Admin-only apps require admin, manager, internal, or system_admin role AND app permission
    if (app.adminOnly) {
      // Regular users cannot access admin-only apps
      if (userRole === 'user') {
        return { ...app, available: false }
      }
      // System admins and admins have all permissions, so they can access
      if (hasSystemAdminPrivileges(userRole) || hasAdminPrivileges(userRole)) {
        return app
      }
      // For internal users and managers, check if they have explicit permission
      if (!hasAppPermission(app.id)) {
        return { ...app, available: false }
      }
    }
    // For non-admin-only apps (like Client Portal), check permissions
    if (!hasAppPermission(app.id)) {
      return { ...app, available: false }
    }
    return app
  })

  const handleAppClick = (appId: string) => {
    const userRole = session?.user?.role
    
    if (appId === 'client-portal') {
      // Redirect to the current dashboard
      if (hasAdminPrivileges(userRole)) {
        router.push('/dashboard')
      } else {
        router.push('/dashboard?tab=user-dashboard')
      }
    } else if (appId === 'crm' || appId === 'lead-generation' || appId === 'invoicing' || appId === 'user-management' || appId === 'analytics' || appId === 'platform-customization' || appId === 'automations') {
      // Admin-only apps - check role before allowing access
      // Regular users should not be able to access these
      if (userRole === 'user') {
        toastError('Access denied: This app is only available to internal users')
        return
      }
      // For internal users and above, check permissions
      if (!hasAppPermission(appId)) {
        toastError('Access denied: You do not have permission to access this app')
        return
      }
      router.push(`/apps/${appId}`)
    } else {
      // For placeholder apps, show coming soon message
      router.push(`/apps/${appId}`)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your apps...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header — matches page background for seamless look */}
      <header className="sticky top-0 z-50 bg-background">
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
                onClick={() => setShowSupportTicketModal(true)}
                className="p-2 hover:bg-muted rounded-md transition-colors"
                title="Create Support Ticket"
              >
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
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
                  {session?.user && hasSystemAdminPrivileges(session.user.role) && (
                    <>
                      <div className="w-px h-px bg-border mx-2 my-1" />
                      <DropdownMenuItem
                        onClick={() => router.push('/apps/system-admin')}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Shield className="w-4 h-4" />
                        <span>System Admin</span>
                      </DropdownMenuItem>
                    </>
                  )}
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
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground/95">
              Welcome back, {session?.user?.name || 'User'}!
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">Choose an app to get started</p>
          </div>

          {/* App Grid — Liquid glass cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {apps.map((app) => {
              const Icon = app.icon
              return (
                <div
                  key={app.id}
                  className={`
                    group flex flex-col h-full cursor-pointer transition-all duration-300 ease-out
                    rounded-2xl
                    border border-gray-200/80 dark:border-white/10
                    bg-white/60 dark:bg-white/[0.06] backdrop-blur-xl backdrop-saturate-150
                    supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-white/[0.08]
                    shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.08)]
                    dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_2px_12px_rgba(0,0,0,0.3)]
                    hover:scale-[1.02] hover:border-gray-300 dark:hover:border-white/15
                    hover:shadow-[0_4px_6px_rgba(0,0,0,0.05),0_12px_24px_rgba(0,0,0,0.1)]
                    dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)_inset,0_8px_32px_rgba(0,0,0,0.4)]
                    ${!app.available ? 'opacity-60 cursor-not-allowed hover:scale-100' : ''}
                  `}
                  onClick={() => app.available && handleAppClick(app.id)}
                  onMouseEnter={(e) => {
                    if (app.available) {
                      const g = (app as { glassGlow?: string }).glassGlow || '120,120,120'
                      const isDark = document.documentElement.classList.contains('dark')
                      const intensity = isDark ? 0.2 : 0.14
                      const baseShadow = isDark
                        ? '0 0 0 1px rgba(255,255,255,0.1) inset, 0 8px 32px rgba(0,0,0,0.4)'
                        : '0 4px 6px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.1)'
                      e.currentTarget.style.boxShadow = `${baseShadow}, 0 0 24px rgba(${g},${intensity})`
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = ''
                  }}
                >
                  <div className="flex flex-col flex-1 gap-5 p-5">
                    <div className="flex items-center justify-between gap-3 flex-shrink-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`flex-shrink-0 p-2.5 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 transition-colors duration-300 ${!app.available ? '' : 'group-hover:bg-white/60 dark:group-hover:bg-white/15'}`}
                        >
                          <Icon className={`w-7 h-7 ${app.color}`} />
                        </div>
                        <h3 className="text-lg font-semibold leading-tight break-words">{app.name}</h3>
                      </div>
                      {!app.available && (
                        <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-md bg-white/30 dark:bg-white/10 text-muted-foreground backdrop-blur-sm">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug flex-1 break-words min-h-0">{app.description}</p>
                    <div className="mt-auto flex-shrink-0">
                      <div
                        className={`
                          flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl
                          text-sm font-medium transition-all duration-300
                          ${app.available
                            ? 'bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/15 border border-white/30 dark:border-white/10'
                            : 'bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/5'
                          }
                        `}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (app.available) handleAppClick(app.id)
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
                      </div>
                    </div>
                  </div>
                </div>
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
      {/* Support Ticket Modal */}
      <SupportTicketModal
        isOpen={showSupportTicketModal}
        onClose={() => setShowSupportTicketModal(false)}
        spaceId={null}
      />
    </div>
  )
}

