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
  const [spaceManager, setSpaceManager] = useState<{ name: string; avatar?: string } | null>(null)
  const [spaceServices, setSpaceServices] = useState<string[]>([])

  const isAdmin = session?.user?.role === "admin"
  
  // Initialize viewMode based on URL parameters on mount only
  useEffect(() => {
    // On initial load, determine viewMode from URL
    // If we have a space and are on a client tab, start in client mode
    // Reports can be accessed in client mode even without a space
    // Otherwise, start in admin mode (for admins)
    if (currentSpaceId && (activeTab === "projects" || activeTab === "dashboard" || activeTab === "documents" || activeTab === "company-calendars" || activeTab === "reports" || activeTab === "settings")) {
      setViewMode("client")
    } else if (activeTab === "reports" && !currentSpaceId) {
      // Reports can be accessed without a space - use client mode
      setViewMode("client")
    } else if (!currentSpaceId && isAdmin) {
      setViewMode("admin")
    }
  }, []) // Only run on mount - don't override user actions after that

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
            name: selectedManager.full_name || "Unknown Manager",
            avatar: undefined
          })
        } else {
          setSpaceManager({ name: "No Manager", avatar: undefined })
        }
      } catch (error) {
        console.error("Error fetching manager:", error)
        setSpaceManager({ name: "No Manager", avatar: undefined })
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

  const handleSpaceClick = (spaceId: string) => {
    setCurrentSpace(spaces.find(s => s.id === spaceId) || null)
    setViewMode("client")
    onSpaceChange?.(spaceId)
    onTabChange("overview")
  }

  const handleViewModeChange = (mode: "admin" | "client") => {
    setViewMode(mode)
    if (mode === "admin") {
      onSpaceChange?.(null)
      setCurrentSpace(null)
    }
  }

  const handleAdminViewChange = (view: string) => {
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
    
    // Set admin view and view mode FIRST - this ensures admin mode is set before clearing space
    setAdminView(view)
    setViewMode("admin")
    
    // Clear space and update URL to remove space parameter
    setCurrentSpace(null)
    onSpaceChange?.(null)
    
    // Update URL to remove space parameter and set correct tab
    if (router) {
      router.push(`/dashboard?tab=${mappedTab}`)
    }
    
    // Call onTabChange to ensure state is updated
    onTabChange(mappedTab)
  }

  const handleClientTabChange = (tabId: string) => {
    // If switching to reports and we're in admin mode without a space, switch to client mode
    if (tabId === "reports" && viewMode === "admin" && !currentSpaceId) {
      setViewMode("client")
    }
    // If switching to settings and we have a space, ensure we're in client mode
    if (tabId === "settings" && currentSpaceId && viewMode === "admin") {
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
    startDate: currentSpace.created_at ? new Date(currentSpace.created_at).toLocaleDateString() : "N/A",
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
      <div className="flex-1 flex flex-col min-w-0">
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

