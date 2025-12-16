"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, useAuth } from '@/components/providers/session-provider'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Zap, 
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
  Search
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
import { fetchForms } from '@/lib/database-functions'
import { Form } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import FillFormModal from '@/components/modals/fill-form-modal'
import ConversationalFormModal from '@/components/modals/conversational-form-modal'
import { LeadGenerationDashboard } from './tabs/lead-generation-dashboard'
import { LeadPipeline } from './tabs/lead-pipeline'
import { LeadCapture } from './tabs/lead-capture'
import { AutomationWorkflows } from './tabs/automation-workflows'
import { LeadAnalytics } from './tabs/lead-analytics'
import { LeadSettings } from './tabs/lead-settings'

interface LeadGenerationLayoutProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: Users },
  { id: 'capture', label: 'Capture', icon: FileText },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function LeadGenerationLayout({ activeTab, onTabChange }: LeadGenerationLayoutProps) {
  const { data: session } = useSession()
  const auth = useAuth()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [supportForm, setSupportForm] = useState<Form | null>(null)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null)

  const handleSignOut = () => {
    auth.signOut()
    router.push('/auth/signin')
  }

  // Load support form
  useEffect(() => {
    const loadSupportForm = async () => {
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
        }
      } catch (error) {
        console.error("Error loading support form:", error)
      }
    }

    loadSupportForm()
  }, [])

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
      case 'analytics':
        return <LeadAnalytics />
      case 'settings':
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
              onClick={async () => {
                if (!supportForm) {
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
                      console.warn('Support form not found')
                    }
                  } catch (error) {
                    console.error('Error loading support form:', error)
                  }
                } else {
                  setShowSupportModal(true)
                }
              }}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Support"
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
                  onClick={() => onTabChange('settings')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Settings</span>
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

      {/* Support Modal */}
      {showSupportModal && supportForm && (() => {
        // Parse theme from form description
        let formTheme = {
          primaryColor: '#f97316',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          fontFamily: 'inherit',
          conversational: false
        }
        
        if (supportForm.description) {
          try {
            const themeMatch = supportForm.description.match(/__THEME__({[\s\S]*?})__THEME__/)
            if (themeMatch) {
              formTheme = JSON.parse(themeMatch[1])
            }
          } catch (e) {
            console.error('Error parsing theme:', e)
          }
        }

        return formTheme.conversational ? (
          <ConversationalFormModal
            isOpen={showSupportModal}
            onClose={() => setShowSupportModal(false)}
            onFormSubmitted={() => {
              setShowSupportModal(false)
            }}
            form={supportForm}
            spaceId={null}
            theme={formTheme}
          />
        ) : (
          <FillFormModal
            isOpen={showSupportModal}
            onClose={() => setShowSupportModal(false)}
            onFormSubmitted={() => {
              setShowSupportModal(false)
            }}
            form={supportForm}
            spaceId={null}
            theme={formTheme}
          />
        )
      })()}
    </div>
  )
}

