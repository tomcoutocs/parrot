"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, useAuth } from '@/components/providers/session-provider'
import { 
  LayoutDashboard, 
  Palette,
  Paintbrush,
  Layout,
  Globe,
  Mail,
  Eye,
  Settings,
  Grid3x3,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { hasAdminPrivileges, hasSystemAdminPrivileges } from '@/lib/role-helpers'
import { AppsLayoutHeader } from '@/components/apps/apps-layout-header'
import { SupportTicketModal } from '@/components/modals/support-ticket-modal'
import { CustomizationDashboard } from './tabs/customization-dashboard'
import { CustomizationBranding } from './tabs/customization-branding'
import { CustomizationThemes } from './tabs/customization-themes'
import { CustomizationLayout } from './tabs/customization-layout'
import { CustomizationWhiteLabel } from './tabs/customization-white-label'
import { CustomizationEmail } from './tabs/customization-email'
import { CustomizationPreview } from './tabs/customization-preview'
import { CustomizationSettings } from './tabs/customization-settings'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import UserSettingsTab from '@/components/tabs/user-settings-tab'

interface PlatformCustomizationLayoutProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'themes', label: 'Themes', icon: Paintbrush },
  { id: 'layout', label: 'Layout', icon: Layout },
  { id: 'white-label', label: 'White-Label', icon: Globe },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function PlatformCustomizationLayout({ activeTab, onTabChange }: PlatformCustomizationLayoutProps) {
  const { data: session } = useSession()
  const auth = useAuth()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showSupportTicketModal, setShowSupportTicketModal] = useState(false)
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false)
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null)

  const handleSignOut = () => {
    auth.signOut()
    router.push('/auth/signin')
  }

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

  // Check if user has permission for a specific tab
  const hasTabPermission = (tabId: string): boolean => {
    if (!session?.user) return false
    if (hasAdminPrivileges(session.user.role)) return true // Admins have all permissions
    
    const tabPermissions = session.user.tab_permissions || []
    const permissionKey = `platform-customization:${tabId}`
    
    // Check for new format (app:tab) or old format (just app name)
    return tabPermissions.includes(permissionKey) || tabPermissions.includes('platform-customization')
  }

  // Filter navigation items based on permissions
  const filteredNavigationItems = navigationItems.filter(item => hasTabPermission(item.id))

  // If current tab is not accessible, redirect to first accessible tab
  useEffect(() => {
    if (!hasTabPermission(activeTab) && filteredNavigationItems.length > 0) {
      onTabChange(filteredNavigationItems[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, session?.user?.tab_permissions])

  // Get current tab display name and icon
  const currentTab = navigationItems.find(item => item.id === activeTab) || navigationItems[0]
  const getTabDisplayName = () => currentTab?.label ?? 'Platform Customization'

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CustomizationDashboard />
      case 'branding':
        return <CustomizationBranding />
      case 'themes':
        return <CustomizationThemes />
      case 'layout':
        return <CustomizationLayout />
      case 'white-label':
        return <CustomizationWhiteLabel />
      case 'email':
        return <CustomizationEmail />
      case 'preview':
        return <CustomizationPreview />
      case 'settings':
        return <CustomizationSettings />
      default:
        return <CustomizationDashboard />
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppsLayoutHeader
        pageTitle={getTabDisplayName()}
        pageIcon={currentTab?.icon}
        userProfilePicture={userProfilePicture}
        userName={session?.user?.name || 'User'}
        showSystemAdmin={hasSystemAdminPrivileges(session?.user?.role)}
        onSupportClick={() => setShowSupportTicketModal(true)}
        onUserSettingsClick={() => setShowUserSettingsModal(true)}
        onSignOut={handleSignOut}
      />

      <div className="flex flex-1 min-h-0">
      {/* Sidebar Navigation */}
      <aside className={`bg-background border-r border-border/50 flex flex-col transition-all duration-200 relative z-10 ${
        isCollapsed ? "w-16" : "w-60"
      }`}>
        {/* Sidebar Header */}
        <div className={`px-4 py-5 border-b border-border/50 ${isCollapsed ? "px-3" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            {!isCollapsed && (
              <div className="flex items-center gap-3 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/apps')}
                  className="gap-2 h-[35px] px-3 hover:bg-transparent"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span>Apps</span>
                </Button>
                <div className="h-6 w-px bg-border" />
                <h3 className="text-sm font-medium">Customization</h3>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 hover:bg-muted rounded-md transition-colors ${
                isCollapsed ? "mx-auto" : ""
              }`}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
          
          {!isCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-background border-border"
              />
            </div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-muted text-foreground font-medium border-l-2 border-l-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-0 overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderContent()}
        </div>
      </div>
      </div>

      {/* Support Ticket Modal */}
      <SupportTicketModal
        isOpen={showSupportTicketModal}
        onClose={() => setShowSupportTicketModal(false)}
        spaceId={null}
      />

      {/* User Settings Modal */}
      <Dialog open={showUserSettingsModal} onOpenChange={setShowUserSettingsModal}>
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
    </div>
  )
}

