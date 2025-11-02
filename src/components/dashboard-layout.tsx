"use client"

import { useState } from 'react'
import { useSession, useAuth } from '@/components/providers/session-provider'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Settings, 
  FolderOpen, 
  Users,
  Menu,
  LogOut,
  Kanban,
  Building2,
  TrendingUp,
  Bug,
  LayoutDashboard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import ParrotLogo from '@/components/ui/parrot-logo'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { QuickThemeToggle } from '@/components/ui/settings-modal'
import { Breadcrumb, useBreadcrumbs } from '@/components/ui/breadcrumb'


interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  breadcrumbContext?: {
    projectName?: string
    projectId?: string
    taskTitle?: string
    folderName?: string
    folderPath?: string
  }
}

export type TabType = 'dashboard' | 'projects' | 'forms' | 'services' | 'company-calendars' | 'documents' | 'admin' | 'companies' | 'project-overview' | 'debug'

const navigationItems = [
  { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'user'] },
  { id: 'projects' as TabType, label: 'Projects', icon: Kanban, roles: ['admin', 'manager', 'user'] },
  { id: 'project-overview' as TabType, label: 'Project Overview', icon: TrendingUp, roles: ['admin', 'manager'] },
  { id: 'forms' as TabType, label: 'Forms', icon: FileText, roles: ['admin', 'manager', 'user'] },
  { id: 'services' as TabType, label: 'Services', icon: Settings, roles: ['admin', 'manager', 'user'] },
  { id: 'company-calendars' as TabType, label: 'Company Calendars', icon: Building2, roles: ['admin', 'manager', 'user'] },
  { id: 'documents' as TabType, label: 'Documents', icon: FolderOpen, roles: ['admin', 'manager', 'user'] },

  { id: 'admin' as TabType, label: 'Users', icon: Users, roles: ['admin'] },
  { id: 'companies' as TabType, label: 'Companies', icon: Building2, roles: ['admin'] },
  { id: 'debug' as TabType, label: 'Debug', icon: Bug, roles: ['admin'] },
]

export default function DashboardLayout({ 
  children, 
  activeTab, 
  onTabChange, 
  breadcrumbContext 
}: DashboardLayoutProps) {
  const { data: session } = useSession()
  const auth = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  
  // Generate breadcrumbs based on current tab and context
  const breadcrumbs = useBreadcrumbs(activeTab, breadcrumbContext)
  
  const handleBreadcrumbNavigation = (href: string) => {
    onTabChange(href as TabType)
  }

  const handleSignOut = () => {
    auth.signOut()
    router.push('/auth/signin')
  }

  if (!session) {
    return null
  }

  const userRole = session.user.role
  const userTabPermissions = session.user.tab_permissions || []
  
  // Filter navigation items based on role and tab permissions
  const filteredNavItems = navigationItems.filter(item => {
    // Admin users can see all tabs
    if (userRole === 'admin') return true
    
    // For non-admin users, check both role and tab permissions
    const hasRoleAccess = item.roles.includes(userRole)
    const hasTabPermission = userTabPermissions.includes(item.id)
    
    return hasRoleAccess && hasTabPermission
  })


  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen parrot-page-bg">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} parrot-sidebar-gradient shadow-lg transition-all duration-300 flex flex-col`}>
        <div className="p-2 border-b logo-section">
          <div className="flex items-center justify-between">
            <div className="parrot-logo-container-simple">
              <ParrotLogo size="sm" />
              <h1 className={`parrot-logo-text text-lg ${!sidebarOpen && 'hidden'}`}>
                Parrot
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-700 hover:bg-gray-200 h-8 w-8 p-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="parrot-sidebar-user">
          <div className="parrot-sidebar-user-avatar">
            {getInitials(session.user.name)}
          </div>
          {sidebarOpen && (
            <div className="flex flex-col justify-center">
              <div className="parrot-sidebar-user-name">
                {session.user.name}
              </div>
              <div className="parrot-sidebar-user-role">
                {userRole}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
             <nav className="flex-1 p-2 space-y-1 nav-section">
               {filteredNavItems.map((item) => {
                 const Icon = item.icon
                 const isActive = activeTab === item.id

                 const navItem = (
                   <div
                     key={item.id}
                     className={`parrot-nav-item ${isActive ? 'active' : ''}`}
                     onClick={() => onTabChange(item.id)}
                   >
                     <Icon className="parrot-nav-icon" />
                     {sidebarOpen && <span>{item.label}</span>}
                   </div>
                 )

                 // Show tooltip only when sidebar is minimized
                 if (!sidebarOpen) {
                   return (
                     <Tooltip key={item.id}>
                       <TooltipTrigger asChild>
                         {navItem}
                       </TooltipTrigger>
                       <TooltipContent side="right" className="ml-2">
                         <p>{item.label}</p>
                       </TooltipContent>
                     </Tooltip>
                   )
                 }

                 return navItem
               })}
             </nav>

        {/* User Menu */}
        <div className="sidebar-section">
          {!sidebarOpen ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="parrot-nav-item">
                      <Settings className="parrot-nav-icon" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1">
                      <QuickThemeToggle />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="parrot-nav-item">
                  <Settings className="parrot-nav-icon" />
                  <span>Settings</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1">
                  <QuickThemeToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="parrot-header-dark px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col space-y-2">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 capitalize">
                {activeTab.replace('-', ' ')}
              </h2>
              <Breadcrumb 
                items={breadcrumbs} 
                onNavigate={handleBreadcrumbNavigation}
                className="text-xs"
              />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Welcome to Parrot, {session.user.name}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 parrot-scrollbar">
          <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
    </TooltipProvider>
  )
} 