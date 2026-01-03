"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, useAuth } from '@/components/providers/session-provider'
import { 
  BarChart3,
  Server,
  MessageSquare,
  LogOut,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { SystemAdminAnalytics } from './tabs/system-admin-analytics'
import { SystemAdminMonitoring } from './tabs/system-admin-monitoring'
import { SystemAdminTickets } from './tabs/system-admin-tickets'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import UserSettingsTab from '@/components/tabs/user-settings-tab'
import { supabase } from '@/lib/supabase'
import { SupportTicketModal } from '@/components/modals/support-ticket-modal'
import { HelpCircle } from 'lucide-react'

interface SystemAdminLayoutProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navigationItems = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'monitoring', label: 'System Monitoring', icon: Server },
  { id: 'tickets', label: 'Support Tickets', icon: MessageSquare },
]

export function SystemAdminLayout({ activeTab, onTabChange }: SystemAdminLayoutProps) {
  const { data: session } = useSession()
  const auth = useAuth()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
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

  const getTabDisplayName = () => {
    const item = navigationItems.find(item => item.id === activeTab)
    return item ? item.label : 'System Admin'
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <SystemAdminAnalytics />
      case 'monitoring':
        return <SystemAdminMonitoring />
      case 'tickets':
        return <SystemAdminTickets />
      default:
        return <SystemAdminAnalytics />
    }
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} border-r border-border/50 bg-card transition-all duration-300 flex flex-col`}>
        {/* Logo/Header */}
        <div className="h-14 border-b border-border/50 flex items-center justify-between px-4">
          {!isCollapsed && (
            <h1 className="text-lg font-semibold">System Admin</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-border/50 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={userProfilePicture || undefined} />
                  <AvatarFallback>
                    {session.user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{session.user.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">System Admin</p>
                  </div>
                )}
                {!isCollapsed && <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowUserSettingsModal(true)}>
                <User className="w-4 h-4 mr-2" />
                User Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/apps')}>
                <Settings className="w-4 h-4 mr-2" />
                Back to Apps
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-0">
        {/* Top Bar */}
        <div className="h-14 border-b border-border/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
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
                <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted transition-colors">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={userProfilePicture || undefined} />
                    <AvatarFallback>
                      {session.user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowUserSettingsModal(true)}>
                  <User className="w-4 h-4 mr-2" />
                  User Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/apps')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Back to Apps
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
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

