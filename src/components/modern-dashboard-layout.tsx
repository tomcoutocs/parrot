"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/components/providers/session-provider"
import { useRouter } from "next/navigation"
import { Bell, Settings, ChevronDown, LayoutDashboard, LogOut, User, Check, HelpCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModernSidebar } from "./modern-sidebar"
import { ModernNavigation } from "./modern-navigation"
import { SpaceOverview } from "./space-overview"
// Lazy load admin components to reduce initial bundle size
import dynamic from "next/dynamic"

const AdminAllProjects = dynamic(() => import("./admin-all-projects").then(m => ({ default: m.AdminAllProjects })), { ssr: false })
const AdminAllTasks = dynamic(() => import("./admin-all-tasks").then(m => ({ default: m.AdminAllTasks })), { ssr: false })
const AdminDashboard = dynamic(() => import("./admin-dashboard").then(m => ({ default: m.AdminDashboard })), { ssr: false })
const AdminAnalytics = dynamic(() => import("./admin-analytics").then(m => ({ default: m.AdminAnalytics })), { ssr: false })
const AdminTeam = dynamic(() => import("./admin-team").then(m => ({ default: m.AdminTeam })), { ssr: false })
const AdminAllUsers = dynamic(() => import("./admin-all-users").then(m => ({ default: m.AdminAllUsers })), { ssr: false })
const ModernOverviewTab = dynamic(() => import("./modern-overview-tab").then(m => ({ default: m.ModernOverviewTab })), { ssr: false })
const ModernDashboardTab = dynamic(() => import("./modern-dashboard-tab").then(m => ({ default: m.ModernDashboardTab })), { ssr: false })
const ModernTasksTab = dynamic(() => import("./modern-tasks-tab").then(m => ({ default: m.ModernTasksTab })), { ssr: false })
const ModernProjectsTab = dynamic(() => import("./modern-projects-tab").then(m => ({ default: m.ModernProjectsTab })), { ssr: false })
const ModernDocumentsTab = dynamic(() => import("./modern-documents-tab").then(m => ({ default: m.ModernDocumentsTab })), { ssr: false })
const ModernCalendarTab = dynamic(() => import("./modern-calendar-tab").then(m => ({ default: m.ModernCalendarTab })), { ssr: false })
const ModernReportsTab = dynamic(() => import("./modern-reports-tab").then(m => ({ default: m.ModernReportsTab })), { ssr: false })
const ModernUsersTab = dynamic(() => import("./modern-users-tab").then(m => ({ default: m.ModernUsersTab })), { ssr: false })
const ModernSettingsTab = dynamic(() => import("./modern-settings-tab").then(m => ({ default: m.ModernSettingsTab })), { ssr: false })
import LazyTabComponent from "./lazy-tab-loader"
import { fetchCompaniesOptimized, fetchProjectsOptimized } from "@/lib/simplified-database-functions"
import { Company, Service, Form } from "@/lib/supabase"
import { getCompanyServices, fetchForms } from "@/lib/database-functions"
import { supabase } from "@/lib/supabase"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useAuth } from "@/components/providers/session-provider"
import { LogoutConfirmationDialog } from "@/components/ui/confirmation-dialog"
import FillFormModal from "@/components/modals/fill-form-modal"
import ConversationalFormModal from "@/components/modals/conversational-form-modal"

interface ModernDashboardLayoutProps {
  children: React.ReactNode
  activeTab: string
  onTabChange: (tab: string) => void
  currentSpaceId?: string | null
  onSpaceChange?: (spaceId: string | null) => void
}

export function ModernDashboardLayout({
  children,
  activeTab,
  onTabChange,
  currentSpaceId,
  onSpaceChange,
}: ModernDashboardLayoutProps) {
  const { data: session } = useSession()
  const auth = useAuth()
  const router = useRouter()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [viewMode, setViewMode] = useState<"admin" | "client">("admin")
  const [adminView, setAdminView] = useState("dashboard")
  const [spaces, setSpaces] = useState<Company[]>([])
  const [currentSpace, setCurrentSpace] = useState<Company | null>(null)
  const [spaceManager, setSpaceManager] = useState<{ id?: string; name: string; avatar?: string } | null>(null)
  const [spaceServices, setSpaceServices] = useState<string[]>([])
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0)
  const [supportForm, setSupportForm] = useState<Form | null>(null)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null)

  const isAdmin = session?.user?.role === "admin"
  
  // Initialize viewMode based on URL parameters and space selection
  // Use stable dependencies to avoid array size changes
  const userRole = session?.user?.role ?? null
  
  useEffect(() => {
    // Ensure we have session before determining viewMode
    if (!session || !userRole) return
    
    // user-dashboard and user-settings tabs should always be in client mode and clear space
    if (activeTab === "user-dashboard" || activeTab === "user-settings") {
      setViewMode("client")
      if (currentSpaceId) {
        onSpaceChange?.(null)
      }
      return
    }
    
    // If we have a space selected, always stay in client mode
    // This ensures space-specific tabs (like users) show space users, not admin team
    if (currentSpaceId) {
      setViewMode("client")
      return
    }
    
    // Admin-only tabs should be in admin mode only when no space is selected
    // These tabs require admin mode: spaces, companies, forms, project-overview, debug
    // Note: "admin" tab is handled differently - it can be in client mode when in a space
    const adminOnlyTabs = ['spaces', 'companies', 'forms', 'project-overview', 'debug']
    if (adminOnlyTabs.includes(activeTab)) {
      setViewMode("admin")
      return
    }
    
    // "admin" tab (users) should switch to admin mode only if no space is selected
    // When in a space, "admin" tab shows space users in client mode
    if (activeTab === "admin" && !currentSpaceId) {
      setViewMode("admin")
      setAdminView("team") // Set adminView to "team" to show AdminTeam component
      return
    }
    
    // On initial load, determine viewMode from URL
    // Reports can be accessed without a space - use client mode
    // Otherwise, start in admin mode (for admins only)
    if (activeTab === "reports" && !currentSpaceId) {
      // Reports can be accessed without a space - use client mode
      setViewMode("client")
    } else if (!currentSpaceId && userRole === "admin") {
      // Only admins can use admin mode when no space is selected
      setViewMode("admin")
    } else if (!currentSpaceId && userRole !== "admin") {
      // Non-admin users without a space should be in client mode
      setViewMode("client")
    }
  }, [currentSpaceId, activeTab, userRole, session]) // Update when space or tab changes

  // Fetch manager for the current space
  useEffect(() => {
    const fetchManager = async () => {
      if (!currentSpaceId) {
        setSpaceManager(null)
        return
      }

      try {
        const projects = await fetchProjectsOptimized(currentSpaceId)
        // Find the most common manager from projects, or the most recent project's manager
        const managersMap = new Map<string, { count: number; manager: { id: string; full_name: string | null } }>()
        
        projects.forEach(project => {
          if (project.manager_id && project.manager) {
            const existing = managersMap.get(project.manager_id)
            if (existing) {
              existing.count++
            } else {
              managersMap.set(project.manager_id, {
                count: 1,
                manager: project.manager
              })
            }
          }
        })

        // Get the manager with the most projects, or the first one if none
        let selectedManager = null
        if (managersMap.size > 0) {
          const sortedManagers = Array.from(managersMap.values()).sort((a, b) => b.count - a.count)
          selectedManager = sortedManagers[0].manager
        } else if (projects.length > 0 && projects[0].manager) {
          // Fallback to most recent project's manager
          selectedManager = projects[0].manager
        }

        if (selectedManager) {
          // Fetch profile picture for the selected manager
          const { supabase } = await import("@/lib/supabase")
          let profilePicture = ""
          if (supabase && selectedManager.id) {
            const { data: userData } = await supabase
              .from('users')
              .select('profile_picture')
              .eq('id', selectedManager.id)
              .single()
            if (userData?.profile_picture) {
              profilePicture = userData.profile_picture
            }
          }
          setSpaceManager({
            id: selectedManager.id,
            name: selectedManager.full_name || "Unknown Manager",
            avatar: profilePicture
          })
        } else {
          // Check if company has a manager_id
          const { supabase } = await import("@/lib/supabase")
          if (supabase) {
            const { data: company } = await supabase
              .from('companies')
              .select('manager_id, manager:users!companies_manager_id_fkey(id, full_name, profile_picture)')
              .eq('id', currentSpaceId)
              .single()
            
            if (company?.manager) {
              const managerData = Array.isArray(company.manager) ? company.manager[0] : company.manager
              if (managerData) {
                setSpaceManager({
                  id: managerData.id,
                  name: managerData.full_name || "Unknown Manager",
                  avatar: managerData.profile_picture || ""
                })
              } else {
                setSpaceManager({ name: "No Manager", avatar: "" })
              }
            } else {
              setSpaceManager({ name: "No Manager", avatar: "" })
            }
          } else {
            setSpaceManager({ name: "No Manager", avatar: "" })
          }
        }
      } catch (error) {
        console.error("Error fetching manager:", error)
        setSpaceManager({ name: "No Manager", avatar: "" })
      }
    }

    fetchManager()

    // Listen for profile picture updates to refresh manager
    const handleProfilePictureUpdate = () => {
      fetchManager()
    }

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate)
    
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate)
    }
  }, [currentSpaceId])

  // Fetch services for the current space
  useEffect(() => {
    const fetchServices = async () => {
      if (!currentSpaceId) {
        setSpaceServices([])
        return
      }

      try {
        const services = await getCompanyServices(currentSpaceId)
        setSpaceServices(services.map(service => service.name))
      } catch (error) {
        console.error("Error fetching services:", error)
        setSpaceServices([])
      }
    }

    fetchServices()
  }, [currentSpaceId])

  useEffect(() => {
    const loadSpaces = async () => {
      try {
        const companies = await fetchCompaniesOptimized()
        const activeSpaces = companies.filter(company => company.is_active !== false)
        setSpaces(activeSpaces)
        
        if (currentSpaceId) {
          const space = activeSpaces.find(s => s.id === currentSpaceId)
          if (space) {
            setCurrentSpace(space)
            // Don't force viewMode here - let user actions control it
          }
        }
      } catch (error) {
        console.error("Error loading spaces:", error)
      }
    }

    loadSpaces()
  }, [currentSpaceId])

  // Load support form
  useEffect(() => {
    const loadSupportForm = async () => {
      try {
        const forms = await fetchForms()
        // Try multiple variations to find support form
        const supportTicketForm = forms.find(form => {
          const title = form.title.toLowerCase().trim()
          return title === 'support ticket' || 
                 title === 'support' ||
                 title.includes('support ticket') ||
                 title.includes('support')
        })
        if (supportTicketForm) {
          console.log('Support form found:', supportTicketForm.title)
          setSupportForm(supportTicketForm)
        } else {
          console.log('Support form not found. Available forms:', forms.map(f => f.title))
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

  // Removed this useEffect - it was forcing viewMode changes
  // Let user actions (clicks) control viewMode instead

  const handleSpaceClick = (spaceId: string | null) => {
    console.log('ModernDashboardLayout: handleSpaceClick called with spaceId:', spaceId)
    // Find the space in the current spaces array
    if (spaceId) {
      const selectedSpace = spaces.find(s => s.id === spaceId)
      if (selectedSpace) {
        setCurrentSpace(selectedSpace)
      }
    } else {
      setCurrentSpace(null)
    }
    // Switch to client mode immediately - this ensures we show space content, not spaces selection
    // This must happen BEFORE onSpaceChange to prevent the spaces menu from showing
    if (spaceId) {
      setViewMode("client")
    }
    // Call onSpaceChange - handleSelectSpace will handle setting the tab to dashboard
    // Don't call onTabChange here as it's redundant and can cause race conditions
    onSpaceChange?.(spaceId)
  }

  const handleViewModeChange = (mode: "admin" | "client") => {
    setViewMode(mode)
    if (mode === "admin") {
      onSpaceChange?.(null)
      setCurrentSpace(null)
    }
  }

  const handleAdminViewChange = (view: string) => {
    console.log('ModernDashboardLayout: handleAdminViewChange called with view:', view)
    console.log('ModernDashboardLayout: Current currentSpaceId:', currentSpaceId)
    
    // Direct tabs that don't need admin view mapping
    const directTabs = ['forms', 'companies', 'project-overview', 'debug']
    if (directTabs.includes(view)) {
      // These are direct tabs, not admin views
      setViewMode("admin")
      setAdminView("") // Clear admin view for direct tabs
      onTabChange(view)
      setCurrentSpace(null)
      onSpaceChange?.(null)
      if (router) {
        console.log('ModernDashboardLayout: Navigating to direct tab:', view)
        router.replace(`/dashboard?tab=${view}`)
      }
      return
    }
    
    // Map admin views to existing tabs for URL/routing
    // All admin views use "spaces" tab (which is the admin dashboard) except team which uses "admin" tab
    const tabMap: Record<string, string> = {
      dashboard: "spaces",
      projects: "spaces", // Use spaces tab for admin projects view (shows AdminAllProjects)
      tasks: "spaces", // Use spaces tab for admin tasks view (shows AdminAllTasks)
      calendar: "spaces", // Use spaces tab for admin calendar view
      "all-users": "spaces", // Use spaces tab for admin all users view
      analytics: "spaces", // Use spaces tab for admin analytics view
      team: "admin", // Use admin tab for team view
    }
    const mappedTab = tabMap[view] || "spaces"
    
    // Set admin view and view mode FIRST
    setAdminView(view)
    setViewMode("admin")
    
    // CRITICAL: Clear space and navigate in the correct order
    // Call onTabChange FIRST to set the tab, then clear space
    // This ensures handleSpaceChange knows we're already on an admin tab
    onTabChange(mappedTab)
    
    // Clear space - handleSpaceChange will see we're on an admin tab and won't redirect
    setCurrentSpace(null)
    onSpaceChange?.(null)
    
    // Update URL to remove space parameter and set correct tab
    // Use replace instead of push to avoid adding to history
    if (router) {
      console.log('ModernDashboardLayout: Navigating to admin tab:', mappedTab)
      router.replace(`/dashboard?tab=${mappedTab}`)
    }
  }

  const handleClientTabChange = (tabId: string) => {
    // Handle user-settings and user-dashboard directly - these are personal tabs
    if (tabId === "user-settings" || tabId === "user-dashboard") {
      setViewMode("client")
      // Call onTabChange first to set the tab, then clear space
      onTabChange(tabId)
      // Clear space after tab change to avoid race conditions
      if (currentSpaceId) {
        // Use setTimeout to ensure tab change completes first
        setTimeout(() => {
          onSpaceChange?.(null)
        }, 0)
      }
      return
    }
    
    // Map display tab names back to internal tab names
    const displayToInternalMap: Record<string, string> = {
      "overview": "dashboard",
      "tasks": "projects",
      "forms": "forms",
      "documents": "documents",
      "calendar": "company-calendars",
      "reports": "reports",
      "users": "admin",
      "settings": "settings",
    }
    const internalTabId = displayToInternalMap[tabId] || tabId
    
    // If switching to reports and we're in admin mode without a space, switch to client mode
    if (internalTabId === "reports" && viewMode === "admin" && !currentSpaceId) {
      setViewMode("client")
    }
    // If switching to settings or users and we have a space, ensure we're in client mode
    if ((internalTabId === "settings" || internalTabId === "admin") && currentSpaceId && viewMode === "admin") {
      setViewMode("client")
    }
    // Pass through the internal tab name to onTabChange
    onTabChange(internalTabId)
  }

  // Get space data for display
  const spaceData = currentSpace ? {
    manager: spaceManager || {
      name: "No Manager",
      avatar: undefined
    },
    startDate: currentSpace.created_at ? new Date(currentSpace.created_at).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : "N/A",
    services: spaceServices
  } : null

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <ModernSidebar
        activeSpace={currentSpaceId || null}
        onSpaceChange={handleSpaceClick}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        adminView={adminView}
        onAdminViewChange={handleAdminViewChange}
        onTabChange={handleClientTabChange}
        activeTab={activeTab}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-0">
        {/* Top Bar */}
        <div className="h-14 border-b border-border/50 flex items-center justify-between px-6">
          {viewMode === "admin" ? (
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-lg font-medium">
                {adminView === "projects" && "All Projects"}
                {adminView === "dashboard" && "Admin Dashboard"}
                {adminView === "tasks" && "All Tasks"}
                {adminView === "calendar" && "Calendar"}
                {adminView === "all-users" && "All Users"}
                {adminView === "analytics" && "Analytics"}
                {adminView === "team" && "Team"}
                {!["projects", "dashboard", "tasks", "calendar", "all-users", "analytics", "team"].includes(adminView) && "Admin Dashboard"}
              </h2>
            </div>
          ) : activeTab === "user-dashboard" ? (
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-lg font-medium">Dashboard</h2>
            </div>
          ) : currentSpace ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-muted px-2 py-1 -mx-2 rounded-md transition-colors">
                <h2 className="text-lg font-medium">{currentSpace.name}</h2>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {spaces
                  .sort((a, b) => {
                    const aActive = a.is_active !== false
                    const bActive = b.is_active !== false
                    if (aActive && !bActive) return -1
                    if (!aActive && bActive) return 1
                    return 0
                  })
                  .map((space) => (
                    <DropdownMenuItem
                      key={space.id}
                      onClick={() => handleSpaceClick(space.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {space.is_active !== false && (
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                        )}
                        {space.is_active === false && (
                          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                        )}
                        <span>{space.name}</span>
                      </div>
                      {currentSpaceId === space.id && (
                        <Check className="w-4 h-4 text-muted-foreground" />
                      )}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : activeTab === "user-settings" ? (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-lg font-medium">User Settings</h2>
            </div>
          ) : (
            <h2 className="text-lg font-medium">Select a Space</h2>
          )}
          
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={async () => {
                // If support form not loaded yet, try to load it
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
                  onClick={() => onTabChange('user-settings')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>User Settings</span>
                </DropdownMenuItem>
                <div className="w-px h-px bg-border mx-2 my-1" />
                <DropdownMenuItem
                  onClick={() => setShowLogoutDialog(true)}
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
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-8 py-4 space-y-4">
            {viewMode === "admin" ? (
              <>
                {/* Admin views */}
                {adminView === "projects" && <AdminAllProjects />}
                {adminView === "tasks" && <AdminAllTasks />}
                {adminView === "dashboard" && (
                  <AdminDashboard
                    spaces={spaces.map(s => ({ id: s.id, name: s.name, active: s.is_active !== false }))}
                    spaceData={{}}
                    onSpaceClick={handleSpaceClick}
                    refreshKey={dashboardRefreshKey}
                  />
                )}
                {adminView === "calendar" && <ModernCalendarTab activeSpace={null} />}
                {adminView === "all-users" && <AdminAllUsers />}
                {adminView === "analytics" && <AdminAnalytics />}
                {adminView === "team" && <AdminTeam />}
                {!["projects", "dashboard", "tasks", "calendar", "all-users", "analytics", "team"].includes(adminView) && children}
              </>
            ) : (
              <>
                {/* Space Overview - Hide for user-dashboard and user-settings tabs */}
                {spaceData && activeTab !== "user-dashboard" && activeTab !== "user-settings" && (
                  <SpaceOverview
                    companyId={currentSpaceId || undefined}
                    onNavigateToTab={onTabChange}
                    onManagerChange={() => {
                      // Trigger admin dashboard refresh
                      setDashboardRefreshKey(prev => prev + 1)
                      
                      // Reload manager when it changes
                      const fetchManager = async () => {
                        if (!currentSpaceId) return
                        try {
                          const projects = await fetchProjectsOptimized(currentSpaceId)
                          const managersMap = new Map<string, { count: number; manager: { id: string; full_name: string | null } }>()
                          
                          projects.forEach(project => {
                            if (project.manager_id && project.manager) {
                              const existing = managersMap.get(project.manager_id)
                              if (existing) {
                                existing.count++
                              } else {
                                managersMap.set(project.manager_id, {
                                  count: 1,
                                  manager: project.manager
                                })
                              }
                            }
                          })

                          let selectedManager = null
                          if (managersMap.size > 0) {
                            const sortedManagers = Array.from(managersMap.values()).sort((a, b) => b.count - a.count)
                            selectedManager = sortedManagers[0].manager
                          } else if (projects.length > 0 && projects[0].manager) {
                            selectedManager = projects[0].manager
                          }

                          if (selectedManager) {
                            // Fetch profile picture for the selected manager
                            const { supabase } = await import("@/lib/supabase")
                            let profilePicture = ""
                            if (supabase && selectedManager.id) {
                              const { data: userData } = await supabase
                                .from('users')
                                .select('profile_picture')
                                .eq('id', selectedManager.id)
                                .single()
                              if (userData?.profile_picture) {
                                profilePicture = userData.profile_picture
                              }
                            }
                            setSpaceManager({
                              id: selectedManager.id,
                              name: selectedManager.full_name || "Unknown Manager",
                              avatar: profilePicture
                            })
                          } else {
                            // Check if company has a manager_id
                            const { supabase } = await import("@/lib/supabase")
                            if (supabase) {
                              const { data: company } = await supabase
                                .from('companies')
                                .select('manager_id, manager:users!companies_manager_id_fkey(id, full_name, profile_picture)')
                                .eq('id', currentSpaceId)
                                .single()
                              
                              if (company?.manager) {
                                const managerData = Array.isArray(company.manager) ? company.manager[0] : company.manager
                                if (managerData) {
                                  setSpaceManager({
                                    id: managerData.id,
                                    name: managerData.full_name || "Unknown Manager",
                                    avatar: managerData.profile_picture || ""
                                  })
                                } else {
                                  setSpaceManager({ name: "No Manager", avatar: "" })
                                }
                              } else {
                                setSpaceManager({ name: "No Manager", avatar: "" })
                              }
                            } else {
                              setSpaceManager({ name: "No Manager", avatar: "" })
                            }
                          }
                        } catch (error) {
                          console.error("Error fetching manager:", error)
                          setSpaceManager({ name: "No Manager", avatar: "" })
                        }
                      }
                      fetchManager()
                    }}
                    manager={spaceData.manager}
                    startDate={spaceData.startDate}
                    services={spaceData.services}
                  />
                )}

                {/* Navigation - Hide for user-dashboard and user-settings tabs */}
                {activeTab !== "user-dashboard" && activeTab !== "user-settings" && (
                  <ModernNavigation
                    activeTab={(() => {
                      // Map internal tab names to display tab names
                      const tabMap: Record<string, string> = {
                        "dashboard": "overview",
                        "user-dashboard": "dashboard",
                        "projects": "tasks",
                        "forms": "forms",
                        "documents": "documents",
                        "company-calendars": "calendar",
                        "reports": "reports",
                        "admin": "users",
                        "settings": "settings",
                      }
                      return tabMap[activeTab] || "overview"
                    })()}
                    onTabChange={handleClientTabChange}
                    userRole={session?.user?.role}
                  />
                )}

                {/* Content */}
                {activeTab === "dashboard" && <ModernOverviewTab activeSpace={currentSpaceId ?? null} onNavigateToTab={onTabChange} />}
                {activeTab === "user-dashboard" && <ModernDashboardTab activeSpace={currentSpaceId ?? null} />}
                {activeTab === "projects" && <ModernTasksTab activeSpace={currentSpaceId ?? null} />}
                {activeTab === "documents" && <ModernDocumentsTab activeSpace={currentSpaceId ?? null} />}
                {activeTab === "company-calendars" && <ModernCalendarTab activeSpace={currentSpaceId ?? null} />}
                {activeTab === "reports" && <ModernReportsTab activeSpace={currentSpaceId ?? null} />}
                {activeTab === "admin" && (session?.user?.role === "admin" || session?.user?.role === "manager") && (
                  <ModernUsersTab activeSpace={currentSpaceId ?? null} />
                )}
                {activeTab === "settings" && (session?.user?.role === "admin" || session?.user?.role === "manager") && (
                  <ModernSettingsTab 
                    activeSpace={currentSpaceId ?? null}
                    onServicesUpdated={() => {
                      // Refresh services when they're updated in settings
                      const fetchServices = async () => {
                        if (!currentSpaceId) {
                          setSpaceServices([])
                          return
                        }
                        try {
                          const services = await getCompanyServices(currentSpaceId)
                          setSpaceServices(services.map(service => service.name))
                        } catch (error) {
                          console.error("Error fetching services:", error)
                          setSpaceServices([])
                        }
                      }
                      fetchServices()
                    }}
                  />
                )}
                {activeTab === "forms" && <LazyTabComponent tabName="forms" currentSpaceId={currentSpaceId} />}
                {activeTab === "user-settings" && <LazyTabComponent tabName="user-settings" />}
                {activeTab !== "dashboard" && activeTab !== "projects" && activeTab !== "forms" && activeTab !== "documents" && activeTab !== "company-calendars" && activeTab !== "reports" && activeTab !== "admin" && activeTab !== "settings" && activeTab !== "user-settings" && children}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmationDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={() => {
          auth.signOut()
          router.push('/auth/signin')
        }}
      />

      {/* Support Form Modal */}
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
            // Use a more robust regex that handles multiline JSON
            const themeMatch = supportForm.description.match(/__THEME__({[\s\S]*?})__THEME__/)
            if (themeMatch) {
              formTheme = JSON.parse(themeMatch[1])
              console.log('Parsed theme in dashboard layout:', formTheme)
            }
          } catch (e) {
            console.error('Error parsing theme in dashboard layout:', e)
            // Ignore parse errors, use defaults
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
            spaceId={currentSpaceId}
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
            spaceId={currentSpaceId}
            theme={formTheme}
          />
        )
      })()}
    </div>
  )
}

