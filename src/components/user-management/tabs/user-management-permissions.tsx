"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { fetchUsers, updateUser } from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSession } from '@/components/providers/session-provider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { User as DatabaseUser } from '@/lib/supabase'

interface UserPermissions {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'manager' | 'internal'
  permissions: {
    crm: boolean
    invoicing: boolean
    leadGeneration: boolean
    analytics: boolean
    userManagement: boolean
  }
}

const apps = [
  { id: 'crm', name: 'CRM', icon: Briefcase, description: 'Customer Relationship Management', tabPermission: 'crm' },
  { id: 'invoicing', name: 'Invoicing', icon: DollarSign, description: 'Billing & Invoicing', tabPermission: 'invoicing' },
  { id: 'leadGeneration', name: 'Lead Generation', icon: Users, description: 'Lead Management', tabPermission: 'lead-generation' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, description: 'Reports & Analytics', tabPermission: 'analytics' },
  { id: 'userManagement', name: 'User Management', icon: Shield, description: 'User Administration', tabPermission: 'user-management' },
]

export function UserManagementPermissions() {
  const { data: session } = useSession()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [users, setUsers] = useState<UserPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<UserPermissions['permissions'] | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'internal'>('all')

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true)
      try {
        const dbUsers = await fetchUsers()
        
        // Filter to only show internal users, managers, and admins (exclude client users)
        const teamUsers = dbUsers.filter((dbUser: DatabaseUser) => 
          dbUser.role === 'admin' || 
          dbUser.role === 'manager' || 
          dbUser.role === 'internal'
        )
        
        // Map database users to component format
        const mappedUsers: UserPermissions[] = teamUsers.map((dbUser: DatabaseUser) => {
          const tabPermissions = dbUser.tab_permissions || []
          const isAdmin = dbUser.role === 'admin'
          
          return {
            id: dbUser.id,
            name: dbUser.full_name,
            email: dbUser.email,
            avatar: dbUser.profile_picture,
            role: dbUser.role as 'admin' | 'manager' | 'internal',
            permissions: {
              crm: tabPermissions.includes('crm') || isAdmin,
              invoicing: tabPermissions.includes('invoicing') || isAdmin,
              leadGeneration: tabPermissions.includes('lead-generation') || isAdmin,
              analytics: tabPermissions.includes('analytics') || isAdmin,
              userManagement: tabPermissions.includes('user-management') || isAdmin,
            },
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
      setPermissions({ ...user.permissions })
    }
  }

  const handlePermissionChange = (appId: keyof UserPermissions['permissions'], checked: boolean) => {
    if (permissions) {
      setPermissions({
        ...permissions,
        [appId]: checked,
      })
    }
  }

  const handleSave = async () => {
    if (!selectedUser || !permissions) return
    
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

      // Convert permissions object to tab_permissions array
      const tabPermissions: string[] = []
      if (permissions.crm) tabPermissions.push('crm')
      if (permissions.invoicing) tabPermissions.push('invoicing')
      if (permissions.leadGeneration) tabPermissions.push('lead-generation')
      if (permissions.analytics) tabPermissions.push('analytics')
      if (permissions.userManagement) tabPermissions.push('user-management')

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
          tab_permissions: tabPermissions,
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
          ? { ...user, permissions }
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

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Select User</CardTitle>
            <CardDescription>Choose a user to manage their app permissions</CardDescription>
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
              {selectedUserData ? `${selectedUserData.name}'s Permissions` : 'Select a User'}
            </CardTitle>
            <CardDescription>
              {selectedUserData 
                ? 'Grant or revoke access to specific apps'
                : 'Choose a user from the list to manage their permissions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedUserData && permissions ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  {apps.map((app) => {
                    const Icon = app.icon
                    const appKey = app.id as keyof UserPermissions['permissions']
                    const hasAccess = permissions[appKey]
                    
                    return (
                      <div
                        key={app.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className={`p-2 rounded-lg ${
                          hasAccess 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                            : 'bg-gray-100 dark:bg-gray-900/30'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            hasAccess 
                              ? 'text-emerald-600' 
                              : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <h4 className="font-medium">{app.name}</h4>
                              <p className="text-sm text-muted-foreground">{app.description}</p>
                            </div>
                            <Checkbox
                              checked={hasAccess}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(appKey, checked as boolean)
                              }
                            />
                          </div>
                          {hasAccess && (
                            <Badge variant="outline" className="mt-2">
                              Access Granted
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

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
                <p>Select a user to manage their app permissions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

