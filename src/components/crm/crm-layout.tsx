"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, useAuth } from '@/components/providers/session-provider'
import { 
  LayoutDashboard, 
  Users, 
  Briefcase,
  Building2,
  Calendar,
  BarChart3, 
  Settings,
  Grid3x3,
  ChevronLeft,
  ChevronRight,
  Search,
  Phone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { hasAdminPrivileges, hasSystemAdminPrivileges } from '@/lib/role-helpers'
import { AppsLayoutHeader } from '@/components/apps/apps-layout-header'
import { SupportTicketModal } from '@/components/modals/support-ticket-modal'
import { CRMDashboard } from './tabs/crm-dashboard'
import { CRMContacts } from './tabs/crm-contacts'
import { CRMDeals } from './tabs/crm-deals'
import { CRMAccounts } from './tabs/crm-accounts'
import { CRMActivities } from './tabs/crm-activities'
import { CRMCallLogs } from './tabs/crm-call-logs'
import { CRMReports } from './tabs/crm-reports'
import { CRMSettings } from './tabs/crm-settings'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import UserSettingsTab from '@/components/tabs/user-settings-tab'

interface CRMLayoutProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'deals', label: 'Deals', icon: Briefcase },
  { id: 'accounts', label: 'Accounts', icon: Building2 },
  { id: 'activities', label: 'Activities', icon: Calendar },
  { id: 'call-logs', label: 'Call Logs', icon: Phone },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function CRMLayout({ activeTab, onTabChange }: CRMLayoutProps) {
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
    const { hasAdminPrivileges } = require('@/lib/role-helpers')
    if (hasAdminPrivileges(session.user.role)) return true // Admins have all permissions
    
    const tabPermissions = session.user.tab_permissions || []
    const permissionKey = `crm:${tabId}`
    
    // Check for new format (app:tab) or old format (just app name)
    return tabPermissions.includes(permissionKey) || tabPermissions.includes('crm')
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
  const getTabDisplayName = () => currentTab?.label ?? 'CRM'

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CRMDashboard />
      case 'contacts':
        return <CRMContacts />
      case 'deals':
        return <CRMDeals />
      case 'accounts':
        return <CRMAccounts />
      case 'activities':
        return <CRMActivities />
      case 'call-logs':
        return <CRMCallLogs />
      case 'reports':
        return <CRMReports />
      case 'settings':
        return <CRMSettings />
      default:
        return <CRMDashboard />
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header — matches platform dashboard styling */}
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
                <h3 className="text-sm font-medium">CRM</h3>
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

