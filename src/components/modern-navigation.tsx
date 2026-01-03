"use client"

import { 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  Calendar,
  BarChart3,
  Users,
  Settings
} from "lucide-react"
import { prefetchTab } from "./lazy-tab-loader"

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  roles?: ('system_admin' | 'admin' | 'manager' | 'user' | 'internal')[]
}

interface ModernNavigationProps {
  activeTab: string
  onTabChange: (tabId: string) => void
  userRole?: 'system_admin' | 'admin' | 'manager' | 'user' | 'internal'
}

const navigationItems: NavigationItem[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "tasks", label: "Projects", icon: <CheckSquare className="w-4 h-4" /> },
  { id: "forms", label: "Forms", icon: <FileText className="w-4 h-4" /> },
  { id: "documents", label: "Documents", icon: <FileText className="w-4 h-4" /> },
  { id: "calendar", label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  { id: "reports", label: "Reports", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, roles: ['system_admin', 'admin', 'manager'] },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" />, roles: ['system_admin', 'admin', 'manager'] },
]

export function ModernNavigation({ activeTab, onTabChange, userRole }: ModernNavigationProps) {
  // Filter navigation items based on user role
  const visibleItems = navigationItems.filter(item => {
    // If no roles specified, item is visible to all
    if (!item.roles) return true
    // Check if user role is in allowed roles
    return userRole && item.roles.includes(userRole)
  })

  // Map navigation IDs to internal tab names for prefetching
  const getTabName = (navId: string): string => {
    const tabMap: Record<string, string> = {
      'overview': 'dashboard',
      'tasks': 'projects',
      'forms': 'forms',
      'documents': 'documents',
      'calendar': 'company-calendars',
      'reports': 'reports',
      'users': 'admin',
      'settings': 'settings'
    }
    return tabMap[navId] || navId
  }

  return (
    <div className="border-b border-border/50">
      <div className="flex items-center gap-5">
        {visibleItems.map((item) => {
          const isActive = activeTab === item.id
          const tabName = getTabName(item.id)
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              onMouseEnter={() => {
                // Prefetch tab when user hovers (for faster loading)
                prefetchTab(tabName)
              }}
              className={`
                group relative flex items-center gap-2 px-3 py-2.5 text-sm transition-all duration-200 rounded-t-md
                ${isActive 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              <div className={`transition-transform duration-200 ${!isActive ? 'group-hover:scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className="transition-all duration-200">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
              )}
              {!isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent group-hover:bg-muted-foreground/30 transition-colors duration-200" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

