"use client"

import { useState } from 'react'
import { useSession, useAuth } from '@/components/providers/session-provider'
import { useRouter } from 'next/navigation'
import { 
  BarChart3, 
  FileText, 
  Settings, 
  Calendar, 
  MessageSquare, 
  FolderOpen, 
  Phone,
  Users,
  Menu,
  LogOut,
  Shield,
  Kanban,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
import { NotificationBell } from '@/components/ui/notification-bell'

interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export type TabType = 'analytics' | 'projects' | 'forms' | 'services' | 'calendar' | 'documents' | 'chat' | 'admin' | 'companies' | 'debug'

const navigationItems = [
  { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3, roles: ['admin', 'manager', 'user'] },
  { id: 'projects' as TabType, label: 'Projects', icon: Kanban, roles: ['admin', 'manager', 'user'] },
  { id: 'forms' as TabType, label: 'Forms', icon: FileText, roles: ['admin', 'manager', 'user'] },
  { id: 'services' as TabType, label: 'Services', icon: Settings, roles: ['admin', 'manager', 'user'] },
  { id: 'calendar' as TabType, label: 'Calendar', icon: Calendar, roles: ['admin', 'manager', 'user'] },
  { id: 'documents' as TabType, label: 'Documents', icon: FolderOpen, roles: ['admin', 'manager', 'user'] },
  { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare, roles: ['manager', 'user'] },
  { id: 'admin' as TabType, label: 'Users', icon: Users, roles: ['admin'] },
  { id: 'companies' as TabType, label: 'Companies', icon: Building2, roles: ['admin'] },
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'user': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className={`font-bold text-xl text-gray-800 ${!sidebarOpen && 'hidden'}`}>
              Client Portal
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback>{getInitials(session.user.name)}</AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.user.name}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getRoleColor(userRole)} variant="secondary">
                    {userRole}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${!sidebarOpen && 'px-2'}`}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="h-4 w-4" />
                {sidebarOpen && <span className="ml-2">{item.label}</span>}
              </Button>
            )
          })}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
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
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800 capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <span className="text-sm text-gray-600">
                Welcome back, {session.user.name}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 