"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Shield,
  Briefcase,
  DollarSign,
  Users,
  BarChart3,
  Save,
  Loader2,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  FileText,
  Calendar,
  Building2,
  Zap,
  Target,
  Database,
  Bookmark,
  Mail,
  Activity,
  Settings
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fetchUsers, updateUser } from '@/lib/database-functions'
import { hasAdminPrivileges, hasSystemAdminPrivileges } from '@/lib/role-helpers'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSession } from '@/components/providers/session-provider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { User as DatabaseUser } from '@/lib/supabase'

interface AppTab {
  id: string
  label: string
  icon: React.ElementType
}

interface App {
  id: string
  name: string
  icon: React.ElementType
  description: string
  tabs: AppTab[]
}

const apps: App[] = [
  {
    id: 'crm',
    name: 'CRM',
    icon: Briefcase,
    description: 'Customer Relationship Management',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'contacts', label: 'Contacts', icon: Users },
      { id: 'deals', label: 'Deals', icon: Briefcase },
      { id: 'accounts', label: 'Accounts', icon: Building2 },
      { id: 'activities', label: 'Activities', icon: Calendar },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]
  },
  {
    id: 'invoicing',
    name: 'Invoicing',
    icon: DollarSign,
    description: 'Billing & Invoicing',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'invoices', label: 'Invoices', icon: FileText },
      { id: 'clients', label: 'Clients', icon: Users },
      { id: 'recurring', label: 'Recurring', icon: Calendar },
      { id: 'payments', label: 'Payments', icon: DollarSign },
      { id: 'expenses', label: 'Expenses', icon: FileText },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]
  },
  {
    id: 'lead-generation',
    name: 'Lead Generation',
    icon: Users,
    description: 'Lead Management',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pipeline', label: 'Pipeline', icon: Users },
      { id: 'capture', label: 'Capture', icon: FileText },
      { id: 'automation', label: 'Automation', icon: Zap },
      { id: 'campaigns', label: 'Campaigns', icon: Target },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: BarChart3,
    description: 'Reports & Analytics',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'visualizations', label: 'Visualizations', icon: BarChart3 },
      { id: 'explorer', label: 'Data Explorer', icon: Database },
      { id: 'saved', label: 'Saved Reports', icon: Bookmark },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]
  },
  {
    id: 'user-management',
    name: 'User Management',
    icon: Shield,
    description: 'User Administration',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'users', label: 'Users', icon: Users },
      { id: 'invitations', label: 'Invitations', icon: Mail },
      { id: 'permissions', label: 'Permissions', icon: Shield },
      { id: 'activity', label: 'Activity Feed', icon: Activity },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]
  },
]

interface UserPermissions {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'manager' | 'internal'
  tabPermissions: Set<string> // Store as Set for easier checking
}

export function UserManagementPermissions() {
  const { data: session } = useSession()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [users, setUsers] = useState<UserPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tabPermissions, setTabPermissions] = useState<Set<string>>(new Set())
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'internal'>('all')

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true)
      try {
        const dbUsers = await fetchUsers()
        
        // Filter to only show internal users, managers, and admins (exclude client users and system_admin)
        const teamUsers = dbUsers.filter((dbUser: DatabaseUser) => 
          (hasAdminPrivileges(dbUser.role) && !hasSystemAdminPrivileges(dbUser.role)) || 
          dbUser.role === 'manager' || 
          dbUser.role === 'internal'
        )
        
        // Map database users to component format
        const mappedUsers: UserPermissions[] = teamUsers.map((dbUser: DatabaseUser) => {
          const dbTabPermissions = dbUser.tab_permissions || []
          const isAdmin = hasAdminPrivileges(dbUser.role)
          
          // Convert tab_permissions array to Set
          // Support both old format (app names) and new format (app:tab)
          const permissionSet = new Set<string>()
          
          dbTabPermissions.forEach(perm => {
            // If it's in old format (just app name), grant all tabs for that app
            if (['crm', 'invoicing', 'lead-generation', 'analytics', 'user-management'].includes(perm)) {
              const app = apps.find(a => a.id === perm)
              if (app) {
                // Grant all tabs for this app
                app.tabs.forEach(tab => {
                  permissionSet.add(`${app.id}:${tab.id}`)
                })
              }
            } else if (perm.includes(':')) {
              // New format: app:tab
              permissionSet.add(perm)
            }
          })
          
          // Admins get all permissions
          if (isAdmin) {
            apps.forEach(app => {
              app.tabs.forEach(tab => {
                permissionSet.add(`${app.id}:${tab.id}`)
              })
            })
          }
          
          return {
            id: dbUser.id,
            name: dbUser.full_name,
            email: dbUser.email,
            avatar: dbUser.profile_picture,
            role: dbUser.role as 'admin' | 'manager' | 'internal',
            tabPermissions: permissionSet,
          }
        })

        setUsers(mappedUsers)
      } catch (error) {
        console.error('Error loading users:', error)
        toastError('Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setSelectedUser(userId)
      setTabPermissions(new Set(user.tabPermissions))
      // Expand all apps by default when selecting a user
      setExpandedApps(new Set(apps.map(app => app.id)))
    }
  }

  const toggleTabPermission = (appId: string, tabId: string) => {
    const permissionKey = `${appId}:${tabId}`
    const newPermissions = new Set(tabPermissions)
    
    if (newPermissions.has(permissionKey)) {
      newPermissions.delete(permissionKey)
    } else {
      newPermissions.add(permissionKey)
    }
    
    setTabPermissions(newPermissions)
  }

  const toggleAppPermissions = (appId: string) => {
    const app = apps.find(a => a.id === appId)
    if (!app) return
    
    const appTabKeys = app.tabs.map(tab => `${appId}:${tab.id}`)
    const allTabsGranted = appTabKeys.every(key => tabPermissions.has(key))
    
    const newPermissions = new Set(tabPermissions)
    
    if (allTabsGranted) {
      // Remove all tabs for this app
      appTabKeys.forEach(key => newPermissions.delete(key))
    } else {
      // Add all tabs for this app
      appTabKeys.forEach(key => newPermissions.add(key))
    }
    
    setTabPermissions(newPermissions)
  }

  const toggleAppExpanded = (appId: string) => {
    const newExpanded = new Set(expandedApps)
    if (newExpanded.has(appId)) {
      newExpanded.delete(appId)
    } else {
      newExpanded.add(appId)
    }
    setExpandedApps(newExpanded)
  }

  const handleSave = async () => {
    if (!selectedUser) return
    
    setSaving(true)
    try {
      // Find the current user data
      const currentUser = users.find(u => u.id === selectedUser)
      if (!currentUser) {
        toastError('User not found')
        return
      }

      // Fetch the full user data from database
      const dbUsers = await fetchUsers()
      const dbUser = dbUsers.find(u => u.id === selectedUser)
      if (!dbUser) {
        toastError('User not found in database')
        return
      }

      // Convert Set to array for storage
      const tabPermissionsArray = Array.from(tabPermissions)

      // Update user with all required fields
      // Handle both space_id and company_id (for migration compatibility)
      const spaceOrCompanyId = (dbUser as any).space_id || dbUser.company_id || undefined
      
      const result = await updateUser(
        selectedUser, 
        {
          email: dbUser.email,
          full_name: dbUser.full_name,
          role: dbUser.role,
          is_active: dbUser.is_active,
          assigned_manager_id: dbUser.assigned_manager_id,
          company_id: spaceOrCompanyId,
          tab_permissions: tabPermissionsArray,
          profile_picture: dbUser.profile_picture,
        },
        session?.user?.id || undefined // Pass the current user's ID who is making the change
      )

      if (!result.success) {
        toastError(result.error || 'Failed to save permissions')
        return
      }

      toastSuccess('Permissions updated successfully')
      
      // Update local state
      const updatedUsers = users.map(user => 
        user.id === selectedUser 
          ? { ...user, tabPermissions: new Set(tabPermissions) }
          : user
      )
      setUsers(updatedUsers)
      
    } catch (error) {
      toastError('Failed to save permissions', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setSaving(false)
    }
  }

  const selectedUserData = users.find(u => u.id === selectedUser)

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role: 'admin' | 'manager' | 'internal' | string) => {
    const variants: Record<string, string> = {
      admin: 'bg-violet-500/20 text-violet-700 dark:bg-violet-500/30 dark:text-violet-300 border-violet-500/50 dark:border-violet-400/50',
      manager: 'bg-blue-500/20 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300 border-blue-500/50 dark:border-blue-400/50',
      internal: 'bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/30 dark:text-emerald-300 border-emerald-500/50 dark:border-emerald-400/50',
    }
    return variants[role] || variants.internal || 'bg-gray-500/20 text-gray-700 dark:bg-gray-500/30 dark:text-gray-300 border-gray-500/50'
  }

  const getRoleLabel = (role: 'admin' | 'manager' | 'internal' | string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      manager: 'Manager',
      internal: 'Internal',
    }
    return labels[role] || role.charAt(0).toUpperCase() + role.slice(1)
  }

  const getAppPermissionCount = (appId: string): { granted: number; total: number } => {
    const app = apps.find(a => a.id === appId)
    if (!app) return { granted: 0, total: 0 }
    
    const total = app.tabs.length
    const granted = app.tabs.filter(tab => tabPermissions.has(`${appId}:${tab.id}`)).length
    
    return { granted, total }
  }

  const isAppFullyGranted = (appId: string): boolean => {
    const { granted, total } = getAppPermissionCount(appId)
    return granted === total && total > 0
  }

  const isAppPartiallyGranted = (appId: string): boolean => {
    const { granted, total } = getAppPermissionCount(appId)
    return granted > 0 && granted < total
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Select User</CardTitle>
            <CardDescription>Choose a user to manage their tab permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
            <div className="space-y-4">
              {/* Filters */}
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Role Filter */}
                <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No users found</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selectedUser === user.id
                          ? 'bg-muted border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Avatar>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{user.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-1.5">{user.email}</p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-medium px-2 py-0.5 ${getRoleBadge(user.role)}`}
                          >
                            {getRoleLabel(user.role)}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedUserData ? `${selectedUserData.name}'s Tab Permissions` : 'Select a User'}
            </CardTitle>
            <CardDescription>
              {selectedUserData 
                ? 'Grant or revoke access to specific tabs within each app'
                : 'Choose a user from the list to manage their permissions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedUserData ? (
              <div className="space-y-4">
                {apps.map((app) => {
                  const AppIcon = app.icon
                  const isExpanded = expandedApps.has(app.id)
                  const { granted, total } = getAppPermissionCount(app.id)
                  const isFullyGranted = isAppFullyGranted(app.id)
                  const isPartiallyGranted = isAppPartiallyGranted(app.id)
                  
                  return (
                    <div key={app.id} className="border rounded-lg">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            isFullyGranted
                              ? 'bg-emerald-100 dark:bg-emerald-900/30'
                              : isPartiallyGranted
                              ? 'bg-amber-100 dark:bg-amber-900/30'
                              : 'bg-gray-100 dark:bg-gray-900/30'
                          }`}>
                            <AppIcon className={`w-5 h-5 ${
                              isFullyGranted
                                ? 'text-emerald-600'
                                : isPartiallyGranted
                                ? 'text-amber-600'
                                : 'text-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{app.name}</h4>
                              {isPartiallyGranted && (
                                <Badge variant="outline" className="text-xs">
                                  {granted}/{total}
                                </Badge>
                              )}
                              {isFullyGranted && (
                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                  All tabs
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{app.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isFullyGranted}
                            onCheckedChange={() => toggleAppPermissions(app.id)}
                            className="mr-2"
                          />
                          <button
                            onClick={() => toggleAppExpanded(app.id)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-2 border-t">
                          {app.tabs.map((tab) => {
                            const TabIcon = tab.icon
                            const permissionKey = `${app.id}:${tab.id}`
                            const hasPermission = tabPermissions.has(permissionKey)
                            
                            return (
                              <div
                                key={tab.id}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <TabIcon className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{tab.label}</span>
                                </div>
                                <Checkbox
                                  checked={hasPermission}
                                  onCheckedChange={() => toggleTabPermission(app.id, tab.id)}
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Permissions
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a user to manage their tab permissions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
