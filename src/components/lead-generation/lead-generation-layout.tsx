"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, useAuth } from '@/components/providers/session-provider'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Zap, 
  Target,
  Workflow,
  BarChart3, 
  Settings, 
  Plus,
  Grid3x3,
  LogOut,
  User,
  ChevronDown,
  HelpCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  Search,
  UserPlus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { supabase } from '@/lib/supabase'
import { SupportTicketModal } from '@/components/modals/support-ticket-modal'
import { LeadGenerationDashboard } from './tabs/lead-generation-dashboard'
import { LeadPipeline } from './tabs/lead-pipeline'
import { LeadCapture } from './tabs/lead-capture'
import { AutomationWorkflows } from './tabs/automation-workflows'
import { LeadCampaigns } from './tabs/lead-campaigns'
import { CampaignBuilderTab } from './tabs/campaign-builder-tab'
import { LeadAnalytics } from './tabs/lead-analytics'
import { LeadSettings } from './tabs/lead-settings'
import { LeadReferrals } from './tabs/lead-referrals'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import UserSettingsTab from '@/components/tabs/user-settings-tab'
import { hasAdminPrivileges } from '@/lib/role-helpers'

interface LeadGenerationLayoutProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

// Navigation items - settings only shown to admins
const getNavigationItems = (isAdmin: boolean) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pipeline', label: 'Pipeline', icon: Users },
    { id: 'capture', label: 'Capture', icon: FileText },
    { id: 'automation', label: 'Automation', icon: Zap },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'campaign-builder', label: 'Campaign Builder', icon: Workflow },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'referrals', label: 'Referrals', icon: UserPlus },
  ]
  
  if (isAdmin) {
    items.push({ id: 'settings', label: 'Settings', icon: Settings })
  }
  
  return items
}

export function LeadGenerationLayout({ activeTab, onTabChange }: LeadGenerationLayoutProps) {
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
    const loadUserProfilePicture = async () => {
      if (!session?.user?.id || !supabase) return
      
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

  // Check if user is admin
  const isAdmin = hasAdminPrivileges(session?.user?.role)
  const navigationItems = getNavigationItems(isAdmin)

  // Get current tab display name
  const getTabDisplayName = () => {
    const tab = navigationItems.find(item => item.id === activeTab)
    return tab ? tab.label : 'Lead Generation'
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <LeadGenerationDashboard />
      case 'pipeline':
        return <LeadPipeline />
      case 'capture':
        return <LeadCapture />
      case 'automation':
        return <AutomationWorkflows />
      case 'campaigns':
        return <LeadCampaigns />
      case 'campaign-builder':
        return <CampaignBuilderTab onNavigateToCampaigns={() => onTabChange('campaigns')} />
      case 'analytics':
        return <LeadAnalytics />
      case 'referrals':
        return <LeadReferrals />
      case 'settings':
        // Only admins can access settings
        if (!isAdmin) {
          return <LeadGenerationDashboard />
        }
        return <LeadSettings />
      default:
        return <LeadGenerationDashboard />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className={`bg-sidebar border-r border-border/50 h-screen flex flex-col transition-all duration-200 relative z-10 ${
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
                  className="gap-2 h-auto p-0 hover:bg-transparent"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span>Apps</span>
                </Button>
                <div className="h-6 w-px bg-border" />
                <h3 className="text-sm font-medium">Lead Generation</h3>
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
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-muted text-foreground font-medium'
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
      <div className="flex-1 flex flex-col min-w-0 relative z-0">
        {/* Top Bar */}
        <div className="h-14 border-b border-border/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-medium">{getTabDisplayName()}</h2>
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
                  onClick={() => router.push('/apps')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span>Back to Apps</span>
                </DropdownMenuItem>
                <div className="w-px h-px bg-border mx-2 my-1" />
                <DropdownMenuItem
                  onClick={() => setShowUserSettingsModal(true)}
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

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-6">
            {renderContent()}
          </div>
        </main>
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

