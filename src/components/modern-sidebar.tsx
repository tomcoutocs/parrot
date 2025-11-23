"use client"

import React, { useState, useEffect } from "react"
import { 
  Plus, 
  Search, 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Calendar, 
  FileText, 
  Users, 
  Settings, 
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Building2,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Check,
  Home
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSession, useAuth } from "@/components/providers/session-provider"
import { fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { Company } from "@/lib/supabase"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/providers/theme-provider"
import { LogoutConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { useRouter } from "next/navigation"
import { CreateSpaceModal } from "@/components/modals/create-space-modal"

interface ModernSidebarProps {
  activeSpace: string | null
  onSpaceChange: (spaceId: string | null) => void
  viewMode: "admin" | "client"
  onViewModeChange: (mode: "admin" | "client") => void
  adminView?: string
  onAdminViewChange?: (view: string) => void
  onSpaceCreated?: () => void
  onTabChange?: (tab: string) => void
  activeTab?: string
}

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  badge?: number
}

export function ModernSidebar({ 
  activeSpace, 
  onSpaceChange, 
  viewMode, 
  onViewModeChange, 
  adminView, 
  onAdminViewChange,
  onSpaceCreated,
  onTabChange,
  activeTab
}: ModernSidebarProps) {
  const { data: session } = useSession()
  const auth = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [spaces, setSpaces] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false)

  const isAdmin = session?.user?.role === "admin"

  useEffect(() => {
    const loadSpaces = async () => {
      if (isAdmin) {
        try {
          const companies = await fetchCompaniesOptimized()
          // Include all companies (active and inactive) - they'll be sorted below
          setSpaces(companies)
        } catch (error) {
          console.error("Error loading spaces:", error)
        }
      } else if (session?.user?.company_id) {
        // Non-admin users only see their own company
        try {
          const companies = await fetchCompaniesOptimized()
          const userSpace = companies.find(c => c.id === session.user.company_id)
          if (userSpace) {
            setSpaces([userSpace])
          }
        } catch (error) {
          console.error("Error loading user space:", error)
        }
      }
    }

    loadSpaces()
  }, [isAdmin, session?.user?.company_id])

  const adminNavigation: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "All Projects", icon: FolderKanban },
    { id: "tasks", label: "All Tasks", icon: CheckSquare },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "all-users", label: "All Users", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "team", label: "Team", icon: Users },
  ]

  const bottomNavigation: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  const filteredSpaces = spaces.filter(space =>
    space.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Sort spaces once and memoize to ensure stable order
  const sortedSpaces = React.useMemo(() => {
    return [...filteredSpaces].sort((a, b) => {
      // Active clients first
      const aActive = a.is_active !== false
      const bActive = b.is_active !== false
      if (aActive && !bActive) return -1
      if (!aActive && bActive) return 1
      // Then sort by name for consistent ordering
      return a.name.localeCompare(b.name)
    })
  }, [filteredSpaces])

  const handleSpaceClick = (spaceId: string) => {
    console.log('ModernSidebar: handleSpaceClick called with spaceId:', spaceId)
    console.log('ModernSidebar: Current activeSpace:', activeSpace)
    console.log('ModernSidebar: Available spaces:', spaces.map(s => ({ id: s.id, name: s.name })))
    
    // Ensure we're passing the correct spaceId
    if (!spaceId) {
      console.error('ModernSidebar: No spaceId provided to handleSpaceClick')
      return
    }
    
    // Verify the space exists
    const spaceExists = spaces.find(s => s.id === spaceId)
    if (!spaceExists) {
      console.error('ModernSidebar: Space not found in spaces array:', spaceId)
      return
    }
    
    onSpaceChange(spaceId)
    // Only change to client mode if clicking a different space
    // If already viewing this space, don't change viewMode
    if (activeSpace !== spaceId) {
      onViewModeChange("client")
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div 
        className={`bg-sidebar border-r border-border/50 h-screen flex flex-col transition-all duration-200 relative z-10 ${
          isCollapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Header */}
        <div className={`px-4 py-5 border-b border-border/50 ${isCollapsed ? "px-3" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            {!isCollapsed && <h3>Parrot</h3>}
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

        {/* Admin Navigation */}
        {isAdmin && (
          <div className={`px-2 py-3 border-b border-border/50 relative z-20 ${isCollapsed ? "px-1" : ""}`}>
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-xs text-muted-foreground">ADMIN</span>
              </div>
            )}
            <div className="space-y-0.5">
              {adminNavigation.map((item) => {
                const Icon = item.icon
                const isActive = (viewMode === "admin" && adminView === item.id)
                const navButton = (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('Admin nav clicked:', item.id, 'Current activeSpace:', activeSpace)
                      // Clear space first, then switch to admin mode
                      if (activeSpace) {
                        onSpaceChange(null)
                      }
                      onViewModeChange("admin")
                      onAdminViewChange?.(item.id)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm relative z-30 ${
                      isCollapsed ? "justify-center px-2" : ""
                    } ${
                      isActive 
                        ? "bg-muted text-foreground" 
                        : "hover:bg-muted/50 hover:text-foreground text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        {navButton}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return navButton
              })}
            </div>
          </div>
        )}

        {/* Spaces List */}
        <ScrollArea className={`flex-1 py-2 space-y-0.5 ${isCollapsed ? "px-1" : ""}`}>
          {!isCollapsed && (
            <div className="px-3 mb-2">
              <span className="text-xs text-muted-foreground">SPACES</span>
            </div>
          )}
          {isCollapsed && (
            <div className="mb-2 px-3">
              <div className="w-full h-px bg-border/50" />
            </div>
          )}
          <div className="space-y-0.5">
            {sortedSpaces.map((space) => {
                const isActive = activeSpace === space.id && viewMode === "client"
                // Use the actual space object's ID directly - don't create a separate variable
                const spaceButton = (
                  <button
                    key={space.id}
                    data-space-id={space.id}
                    data-space-name={space.name}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Get spaceId from the button's data attribute to ensure we have the correct one
                      const clickedSpaceId = e.currentTarget.getAttribute('data-space-id')
                      const clickedSpaceName = e.currentTarget.getAttribute('data-space-name')
                      console.log(`Space button clicked - Space ID: ${clickedSpaceId}, Space Name: ${clickedSpaceName}`)
                      console.log('Space object:', { id: space.id, name: space.name })
                      console.log('All sorted spaces:', sortedSpaces.map(s => ({ id: s.id, name: s.name })))
                      
                      if (clickedSpaceId && clickedSpaceId === space.id) {
                        handleSpaceClick(clickedSpaceId)
                      } else {
                        console.error('Space ID mismatch! Button:', clickedSpaceId, 'Space object:', space.id)
                        // Fallback to space.id from closure
                        handleSpaceClick(space.id)
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-sm ${
                      isCollapsed ? "justify-center px-2" : ""
                    } ${
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {space.is_active !== false ? (
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] flex-shrink-0" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] flex-shrink-0" />
                    )}
                    {!isCollapsed && <span className="truncate">{space.name}</span>}
                  </button>
                )

                if (isCollapsed) {
                  return (
                    <Tooltip key={space.id}>
                      <TooltipTrigger asChild>
                        {spaceButton}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{space.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return spaceButton
              })}
          </div>
        </ScrollArea>

        {/* Bottom Navigation */}
        <div className={`px-2 py-3 border-t border-border/50 ${isCollapsed ? "px-1" : ""}`}>
          <div className="space-y-0.5">
            {/* Create Space Button - Only show for admins */}
            {isAdmin && (
              <>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowCreateSpaceModal(true)}
                        className="w-full flex items-center justify-center px-2 py-2 rounded-md transition-colors text-sm hover:bg-muted/50 hover:text-foreground text-muted-foreground"
                      >
                        <Plus className="w-4 h-4 flex-shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Create Space</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    onClick={() => setShowCreateSpaceModal(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm hover:bg-muted/50 hover:text-foreground text-muted-foreground"
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1 text-left">Create Space</span>
                  </button>
                )}
              </>
            )}
            
            {bottomNavigation.map((item) => {
              const Icon = item.icon
              
              // Special handling for dashboard button
              if (item.id === "dashboard") {
                const isActive = activeTab === "user-dashboard"
                const dashboardButton = (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange?.("user-dashboard")
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                      isCollapsed ? "justify-center px-2" : ""
                    } ${
                      isActive
                        ? "bg-muted text-foreground"
                        : "hover:bg-muted/50 hover:text-foreground text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                  </button>
                )

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        {dashboardButton}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return dashboardButton
              }
              
              // Special handling for settings button with dropdown
              if (item.id === "settings") {
                const settingsButton = (
                  <DropdownMenu key={item.id}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                          isCollapsed ? "justify-center px-2" : ""
                        } hover:bg-muted/50 hover:text-foreground text-muted-foreground`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isCollapsed ? "end" : "start"} side={isCollapsed ? "right" : "top"} className="w-56">
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
                      <div className="h-px bg-border my-1" />
                      <DropdownMenuItem
                        onClick={() => setShowLogoutDialog(true)}
                        className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        {settingsButton}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return settingsButton
              }

              // Regular navigation items
              const navButton = (
                <button
                  key={item.id}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                    isCollapsed ? "justify-center px-2" : ""
                  } hover:bg-muted/50 hover:text-foreground text-muted-foreground`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                </button>
              )

              if (isCollapsed) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      {navButton}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return navButton
            })}
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

        {/* Create Space Modal */}
        <CreateSpaceModal
          isOpen={showCreateSpaceModal}
          onClose={() => setShowCreateSpaceModal(false)}
          onSuccess={() => {
            setShowCreateSpaceModal(false)
            onSpaceCreated?.()
          }}
        />
      </div>
    </TooltipProvider>
  )
}

