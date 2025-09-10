"use client"

import { useState } from 'react'
import { useSession, useAuth } from '@/components/providers/session-provider'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Settings, 
  Calendar, 
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
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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


interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export type TabType = 'dashboard' | 'projects' | 'forms' | 'services' | 'calendar' | 'company-calendars' | 'documents' | 'admin' | 'companies' | 'project-overview' | 'debug'

const navigationItems = [
  { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'user'] },
  { id: 'projects' as TabType, label: 'Projects', icon: Kanban, roles: ['admin', 'manager', 'user'] },
  { id: 'project-overview' as TabType, label: 'Project Overview', icon: TrendingUp, roles: ['admin', 'manager'] },
  { id: 'forms' as TabType, label: 'Forms', icon: FileText, roles: ['admin', 'manager', 'user'] },
  { id: 'services' as TabType, label: 'Services', icon: Settings, roles: ['admin', 'manager', 'user'] },
  { id: 'calendar' as TabType, label: 'Calendar', icon: Calendar, roles: ['admin', 'manager', 'user'] },
  { id: 'company-calendars' as TabType, label: 'Company Calendars', icon: Building2, roles: ['admin', 'manager', 'user'] },
  { id: 'documents' as TabType, label: 'Documents', icon: FolderOpen, roles: ['admin', 'manager', 'user'] },

  { id: 'admin' as TabType, label: 'Users', icon: Users, roles: ['admin'] },
  { id: 'companies' as TabType, label: 'Companies', icon: Building2, roles: ['admin'] },
  { id: 'debug' as TabType, label: 'Debug', icon: Bug, roles: ['admin'] },
]

export default function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const auth = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()

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
    <div className="flex h-screen parrot-page-bg">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} parrot-sidebar-gradient shadow-lg transition-all duration-300 flex flex-col`}>
        <div className="p-2 border-b">
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
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="p-2 border-b border-white/20">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-teal-900/60 text-white backdrop-blur-sm text-xs">{getInitials(session.user.name)}</AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {session.user.name}
                </p>
                <div className="flex items-center space-x-1 mt-0.5">
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs px-1 py-0" variant="secondary">
                    {userRole}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          <TooltipProvider>
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={`w-full justify-start h-8 text-sm ${!sidebarOpen && 'px-2'} ${
                        isActive
                          ? 'bg-teal-900/80 text-white hover:bg-teal-900/90 border border-teal-800/50'
                          : 'text-white hover:bg-white/20'
                      }`}
                      onClick={() => onTabChange(item.id)}
                    >
                      <Icon className="h-4 w-4" />
                      {sidebarOpen && <span className="ml-2">{item.label}</span>}
                    </Button>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </TooltipProvider>
        </nav>

        {/* User Menu */}
        <div className="p-2 border-t border-white/20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/20 h-8 text-sm">
                <Settings className="h-4 w-4" />
                {sidebarOpen && <span className="ml-2">Settings</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="parrot-header-dark px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800 capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome to Parrot, {session.user.name}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 parrot-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
} 