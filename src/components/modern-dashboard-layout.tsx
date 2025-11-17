"use client"

import { useState } from "react"
import { useSession } from "@/components/providers/session-provider"
import { useRouter } from "next/navigation"
import { Bell, Settings, ChevronDown, Check, LayoutDashboard, LogOut, Moon, Sun, Monitor } from "lucide-react"
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
import { AdminAllProjects } from "./admin-all-projects"
import { AdminAllTasks } from "./admin-all-tasks"
import { AdminDashboard } from "./admin-dashboard"
import { AdminAnalytics } from "./admin-analytics"
import { AdminTeam } from "./admin-team"
import { ModernOverviewTab } from "./modern-overview-tab"
import { ModernTasksTab } from "./modern-tasks-tab"
import { ModernProjectsTab } from "./modern-projects-tab"
import { ModernDocumentsTab } from "./modern-documents-tab"
import { ModernCalendarTab } from "./modern-calendar-tab"
import { ModernReportsTab } from "./modern-reports-tab"
import { ModernUsersTab } from "./modern-users-tab"
import { ModernSettingsTab } from "./modern-settings-tab"
import { fetchCompaniesOptimized, fetchProjectsOptimized } from "@/lib/simplified-database-functions"
import { Company, Service } from "@/lib/supabase"
import { getCompanyServices } from "@/lib/database-functions"
import { useEffect } from "react"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useTheme } from "@/components/providers/theme-provider"
import { useAuth } from "@/components/providers/session-provider"
import { LogoutConfirmationDialog } from "@/components/ui/confirmation-dialog"

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
  const { theme, setTheme } = useTheme()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [viewMode, setViewMode] = useState<"admin" | "client">("admin")
  const [adminView, setAdminView] = useState("dashboard")
  const [spaces, setSpaces] = useState<Company[]>([])
  const [currentSpace, setCurrentSpace] = useState<Company | null>(null)
  const [spaceManager, setSpaceManager] = useState<{ id?: string; name: string; avatar?: string } | null>(null)
  const [spaceServices, setSpaceServices] = useState<string[]>([])
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0)

  const isAdmin = session?.user?.role === "admin"
  
  // Initialize viewMode based on URL parameters and space selection
  // Use stable dependencies to avoid array size changes
  const userRole = session?.user?.role ?? null
  
  useEffect(() => {
    // Ensure we have session before determining viewMode
    if (!session || !userRole) return
    
    // If we have a space selected, always stay in client mode
    // This ensures space-specific tabs (like users) show space users, not admin team
    if (currentSpaceId) {
      setViewMode("client")
      return
    }
    
    // Admin-only tabs should be in admin mode only when no space is selected
    // These tabs require admin mode: spaces, companies, project-overview, debug
    // Note: "admin" tab is handled differently - it can be in client mode when in a space
    const adminOnlyTabs = ['spaces', 'companies', 'project-overview', 'debug']
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
    // Otherwise, start in admin mode (for admins)
    if (activeTab === "reports" && !currentSpaceId) {
      // Reports can be accessed without a space - use client mode
      setViewMode("client")
    } else if (!currentSpaceId && userRole === "admin") {
      setViewMode("admin")
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
          setSpaceManager({
            id: selectedManager.id,
            name: selectedManager.full_name || "Unknown Manager",
            avatar: ""
          })
        } else {
          // Check if company has a manager_id
          const { supabase } = await import("@/lib/supabase")
          if (supabase) {
            const { data: company } = await supabase
              .from('companies')
              .select('manager_id, manager:users!companies_manager_id_fkey(id, full_name)')
              .eq('id', currentSpaceId)
              .single()
            
            if (company?.manager) {
              const managerData = Array.isArray(company.manager) ? company.manager[0] : company.manager
              if (managerData) {
                setSpaceManager({
                  id: managerData.id,
                  name: managerData.full_name || "Unknown Manager",
                  avatar: ""
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
    
    // Map admin views to existing tabs for URL/routing
    // All admin views use "spaces" tab (which is the admin dashboard) except team which uses "admin" tab
    const tabMap: Record<string, string> = {
      dashboard: "spaces",
      projects: "spaces", // Use spaces tab for admin projects view (shows AdminAllProjects)
      tasks: "spaces", // Use spaces tab for admin tasks view (shows AdminAllTasks)
      calendar: "spaces", // Use spaces tab for admin calendar view
      documents: "spaces", // Use spaces tab for admin documents view
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
    // If switching to reports and we're in admin mode without a space, switch to client mode
    if (tabId === "reports" && viewMode === "admin" && !currentSpaceId) {
      setViewMode("client")
    }
    // If switching to settings or users and we have a space, ensure we're in client mode
    if ((tabId === "settings" || tabId === "users") && currentSpaceId && viewMode === "admin") {
      setViewMode("client")
    }
    // Pass through the display tab name to onTabChange
    // onTabChange (handleModernTabChange) will handle the mapping to internal tab names
    onTabChange(tabId)
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
                {adminView === "documents" && "Documents"}
                {adminView === "analytics" && "Analytics"}
                {adminView === "team" && "Team"}
                {!["projects", "dashboard", "tasks", "calendar", "documents", "analytics", "team"].includes(adminView) && "Admin Dashboard"}
              </h2>
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
          ) : (
            <h2 className="text-lg font-medium">Select a Space</h2>
          )}
          
          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-muted rounded-md transition-colors">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Theme</div>
                  <div className="space-y-1">
                    <DropdownMenuItem
                      onClick={() => setTheme('light')}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Sun className="w-4 h-4" />
                      <span>Light</span>
                      {theme === 'light' && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTheme('dark')}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Moon className="w-4 h-4" />
                      <span>Dark</span>
                      {theme === 'dark' && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTheme('system')}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Monitor className="w-4 h-4" />
                      <span>System</span>
                      {theme === 'system' && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                  </div>
                </div>
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
            <div className="w-px h-5 bg-border mx-1" />
            <Avatar className="w-7 h-7">
              <AvatarImage src="" />
              <AvatarFallback className="bg-muted text-xs">
                {session?.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || "U"}
              </AvatarFallback>
            </Avatar>
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
                {adminView === "documents" && <ModernDocumentsTab activeSpace={null} />}
                {adminView === "analytics" && <AdminAnalytics />}
                {adminView === "team" && <AdminTeam />}
                {!["projects", "dashboard", "tasks", "calendar", "documents", "analytics", "team"].includes(adminView) && children}
              </>
            ) : (
              <>
                {/* Space Overview */}
                {spaceData && (
                  <SpaceOverview
                    companyId={currentSpaceId || undefined}
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
                            setSpaceManager({
                              id: selectedManager.id,
                              name: selectedManager.full_name || "Unknown Manager",
                              avatar: ""
                            })
                          } else {
                            // Check if company has a manager_id
                            const { supabase } = await import("@/lib/supabase")
                            if (supabase) {
                              const { data: company } = await supabase
                                .from('companies')
                                .select('manager_id, manager:users!companies_manager_id_fkey(id, full_name)')
                                .eq('id', currentSpaceId)
                                .single()
                              
                              if (company?.manager) {
                                const managerData = Array.isArray(company.manager) ? company.manager[0] : company.manager
                                if (managerData) {
                                  setSpaceManager({
                                    id: managerData.id,
                                    name: managerData.full_name || "Unknown Manager",
                                    avatar: ""
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

                {/* Navigation */}
                <ModernNavigation
                  activeTab={(() => {
                    // Map internal tab names to display tab names
                    const tabMap: Record<string, string> = {
                      "dashboard": "overview",
                      "projects": "tasks",
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

                {/* Content */}
                {activeTab === "dashboard" && <ModernOverviewTab activeSpace={currentSpaceId ?? null} />}
                {activeTab === "projects" && <ModernTasksTab activeSpace={currentSpaceId ?? null} />}
                {activeTab === "documents" && <ModernDocumentsTab activeSpace={currentSpaceId ?? null} />}
                {activeTab === "company-calendars" && <ModernCalendarTab activeSpace={currentSpaceId ?? null} />}
                {activeTab === "reports" && <ModernReportsTab activeSpace={currentSpaceId ?? null} />}
                {activeTab === "admin" && (session?.user?.role === "admin" || session?.user?.role === "manager") && (
                  <ModernUsersTab activeSpace={currentSpaceId ?? null} />
                )}
                {activeTab === "settings" && (session?.user?.role === "admin" || session?.user?.role === "manager") && (
                  <ModernSettingsTab activeSpace={currentSpaceId ?? null} />
                )}
                {activeTab !== "dashboard" && activeTab !== "projects" && activeTab !== "documents" && activeTab !== "company-calendars" && activeTab !== "reports" && activeTab !== "admin" && activeTab !== "settings" && children}
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
    </div>
  )
}

