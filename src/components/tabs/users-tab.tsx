'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Edit, Trash2, User as UserIcon, Mail, Shield, Users, Search, Grid3X3, List, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

import { Loader2 } from 'lucide-react'
import { useSession } from '@/components/providers/session-provider'
import { createUser, updateUser, deleteUser, fetchSpaces, fetchUsersWithCompanies } from '@/lib/database-functions'
import type { Company, UserWithCompanies } from '@/lib/supabase'
import { hasAdminPrivileges } from '@/lib/role-helpers'
import { Checkbox } from '@/components/ui/checkbox'
import UserInvitationModal from '@/components/modals/user-invitation-modal'
import { toastSuccess, toastError } from '@/lib/toast'

// Available tabs for user permissions
const availableTabs = [
  { id: 'projects', label: 'Projects', description: 'Manage projects and tasks' },
  { id: 'forms', label: 'Forms', description: 'Create and manage forms' },
  { id: 'services', label: 'Services', description: 'Manage services' },
  { id: 'calendar', label: 'Calendar', description: 'View and manage calendar' },
  { id: 'documents', label: 'Documents', description: 'Manage documents' },

]

interface CreateUserData {
  email: string
  full_name: string
  role: 'system_admin' | 'admin' | 'manager' | 'user' | 'internal'
  password: string
  assigned_manager_id?: string
  company_id?: string
  company_ids?: string[] // For internal users
  primary_company_id?: string // For internal users
  tab_permissions: string[]
}

interface EditUserData {
  email: string
  full_name: string
  role: 'system_admin' | 'admin' | 'manager' | 'user' | 'internal'
  is_active: boolean
  assigned_manager_id?: string
  company_id?: string
  company_ids?: string[] // For internal users
  primary_company_id?: string // For internal users
  tab_permissions: string[]
}

export default function UsersTab({ selectedCompany }: { selectedCompany?: string | null }) {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<UserWithCompanies[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithCompanies | null>(null)
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    email: '',
    full_name: '',
    role: 'user',
    password: '',
    tab_permissions: []
  })
  const [editUserData, setEditUserData] = useState<EditUserData>({
    email: '',
    full_name: '',
    role: 'user',
    is_active: true,
    tab_permissions: []
  })
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')
  const [showInviteUsersModal, setShowInviteUsersModal] = useState(false)

  // Check if current user is admin
  const isAdmin = hasAdminPrivileges(session?.user?.role)

  // Handle URL parameters for company filtering
  useEffect(() => {
    const companyParam = searchParams.get('company')
    console.log('Users tab - URL company parameter:', companyParam)
    console.log('Users tab - selectedCompany prop:', selectedCompany)
    
    // Prioritize URL parameter over prop
    const companyToFilter = companyParam || selectedCompany
    if (companyToFilter) {
      console.log('Setting company filter to:', companyToFilter)
      setCompanyFilter(companyToFilter)
    }
  }, [searchParams, selectedCompany])

  // Debug: Log when company filter changes
  useEffect(() => {
    console.log('Users tab - Company filter changed to:', companyFilter)
  }, [companyFilter])

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  // Memoize filtered users to avoid recalculating on every render
  const filteredUsers = useMemo(() => {
    let filtered = users

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Filter by company
    if (companyFilter !== 'all') {
      filtered = filtered.filter(user => {
        // Check if user has a direct company_id match
        if (user.company_id === companyFilter) {
          return true
        }
        
        // For internal users, check if they have the company in their companies array
        if (user.role === 'internal' && user.companies) {
          return user.companies.some(company => company.company_id === companyFilter)
        }
        
        return false
      })
    }

    return filtered
  }, [users, searchTerm, roleFilter, companyFilter])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const [usersData, companiesData] = await Promise.all([
        fetchUsersWithCompanies(),
        fetchSpaces()
      ])
      setUsers(usersData)
      setCompanies(companiesData)
    } catch (error) {
      console.error('Error loading users:', error)
      toastError('Failed to load users', {
        description: error instanceof Error ? error.message : 'Please try again later'
      })
    } finally {
      setIsLoading(false)
    }
  }



  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!createUserData.email || !createUserData.full_name || !createUserData.password) {
      toastError('Please fill in all required fields')
      return
    }

    try {
      // Call the API route instead of createUser directly to ensure email is sent server-side
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createUserData),
      })

      const result = await response.json()

      if (result.success) {
        toastSuccess('User created successfully and welcome email sent')
        setCreateUserData({ 
          email: '', 
          full_name: '', 
          role: 'user', 
          password: '', 
          assigned_manager_id: '',
          company_id: '',
          company_ids: [],
          primary_company_id: '',
          tab_permissions: [] 
        })
        setShowCreateModal(false)
        await loadUsers()
      } else {
        // Check if it's a company assignment error
        if (result.error && result.error.includes('company assignments')) {
          toastError('Failed to create company assignments', {
            description: 'Please ensure the internal user support is properly set up in the database.'
          })
        } else {
          toastError(result.error || 'Failed to create user')
        }
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toastError('An error occurred while creating the user', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUser) return

    try {
      const result = await updateUser(selectedUser.id, editUserData)
      if (result.success) {
        toastSuccess('User updated successfully')
        setShowEditModal(false)
        setSelectedUser(null)
        await loadUsers()
      } else {
        // Check if it's a company assignment error
        if (result.error && result.error.includes('company assignments')) {
          toastError('Failed to update company assignments', {
            description: 'Please ensure the internal user support is properly set up in the database.'
          })
        } else {
          toastError(result.error || 'Failed to update user')
        }
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toastError('An error occurred while updating the user', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const result = await deleteUser(selectedUser.id)
      if (result.success) {
        toastSuccess('User deleted successfully')
        setShowDeleteModal(false)
        setSelectedUser(null)
        await loadUsers()
      } else {
        toastError(result.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toastError('An error occurred while deleting the user', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    }
  }

  const openEditModal = (user: UserWithCompanies) => {
    setSelectedUser(user)
    setEditUserData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      assigned_manager_id: user.assigned_manager_id,
      company_id: user.company_id,
      company_ids: user.companies?.map(c => c.company_id) || [],
      primary_company_id: user.primary_company?.id,
      tab_permissions: user.tab_permissions || []
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (user: UserWithCompanies) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'user':
        return 'bg-green-100 text-green-800'
      case 'internal':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'manager':
        return <Users className="h-4 w-4" />
      case 'user':
        return <UserIcon className="h-4 w-4" />
      case 'internal':
        return <UserIcon className="h-4 w-4" />
      default:
        return <UserIcon className="h-4 w-4" />
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Access Required</h3>
          <p className="text-gray-600">You need admin privileges to access user management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Create and manage user accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="orange" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowInviteUsersModal(true)}
            disabled={companies.length === 0}
          >
            <Settings className="h-4 w-4 mr-2" />
            Invite Users
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="internal">Internal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by space" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Spaces</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredUsers.length} of {users.length} users
          {(searchTerm || roleFilter !== 'all' || companyFilter !== 'all') && ' (filtered)'}
        </span>
      </div>

      {/* Users Display */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`} />
                      <AvatarFallback>{user.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{user.full_name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getRoleColor(user.role)}>
                    <div className="flex items-center gap-1">
                      {getRoleIcon(user.role)}
                      {user.role}
                    </div>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span>{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                  {user.assigned_manager_id && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Manager:</span>
                      <span className="text-blue-600">
                        {users.find(u => u.id === user.assigned_manager_id)?.full_name || 'Unknown'}
                      </span>
                    </div>
                  )}
                  {user.role === 'internal' && user.companies && user.companies.length > 0 ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Companies:</span>
                      <div className="flex flex-wrap gap-1">
                        {user.companies.map((companyAssignment) => (
                          <Badge 
                            key={companyAssignment.id} 
                            variant={companyAssignment.is_primary ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {companyAssignment.company?.name || 'Unknown'}
                            {companyAssignment.is_primary && ' (Primary)'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : user.company_id && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Company:</span>
                      <span className="text-green-600">
                        {companies.find(c => c.id === user.company_id)?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Tab Access:</span>
                    <div className="flex flex-wrap gap-1">
                      {(user.tab_permissions || []).slice(0, 3).map((tab) => (
                        <Badge key={tab} variant="outline" className="text-xs">
                          {availableTabs.find(t => t.id === tab)?.label || tab}
                        </Badge>
                      ))}
                      {(user.tab_permissions || []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{(user.tab_permissions || []).length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(user)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteModal(user)}
                    className="flex-1"
                    disabled={user.id === session?.user?.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`} />
                      <AvatarFallback>{user.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{user.full_name}</h3>
                        <Badge className={getRoleColor(user.role)}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(user.role)}
                            {user.role}
                          </div>
                        </Badge>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 mt-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        <div>Created: {new Date(user.created_at).toLocaleDateString()}</div>
                        {user.assigned_manager_id && (
                          <div className="text-blue-600">
                            Manager: {users.find(u => u.id === user.assigned_manager_id)?.full_name || 'Unknown'}
                          </div>
                        )}
                        {user.role === 'internal' && user.companies && user.companies.length > 0 ? (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Companies:</span>
                            <div className="flex flex-wrap gap-1">
                              {user.companies.map((companyAssignment) => (
                                <Badge 
                                  key={companyAssignment.id} 
                                  variant={companyAssignment.is_primary ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {companyAssignment.company?.name || 'Unknown'}
                                  {companyAssignment.is_primary && ' (Primary)'}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : user.company_id && (
                          <div className="text-green-600">
                            Company: {companies.find(c => c.id === user.company_id)?.name || 'Unknown'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-600">Tab Access:</span>
                        <div className="flex flex-wrap gap-1">
                          {(user.tab_permissions || []).slice(0, 3).map((tab) => (
                            <Badge key={tab} variant="outline" className="text-xs">
                              {availableTabs.find(t => t.id === tab)?.label || tab}
                            </Badge>
                          ))}
                          {(user.tab_permissions || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(user.tab_permissions || []).length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(user)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteModal(user)}
                      disabled={user.id === session?.user?.id}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={createUserData.email}
                  onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="full_name" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  value={createUserData.full_name}
                  onChange={(e) => setCreateUserData({ ...createUserData, full_name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Select
                  value={createUserData.role}
                  onValueChange={(value: 'admin' | 'manager' | 'user' | 'internal') => {
                    const newData = { ...createUserData, role: value }
                    // Set default password for admin users
                    if (value === 'admin') {
                      newData.password = '!Parrot2025'
                    }
                    setCreateUserData(newData)
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={createUserData.password}
                  onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              {createUserData.role === 'user' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assigned_manager" className="text-right">
                    Assigned Manager
                  </Label>
                  <Select
                    value={createUserData.assigned_manager_id || 'none'}
                    onValueChange={(value) =>
                      setCreateUserData({ ...createUserData, assigned_manager_id: value === 'none' ? undefined : value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a manager (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {users.filter(u => u.role === 'manager').map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Company Selection - Different for internal users */}
              {createUserData.role === 'internal' ? (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    Companies
                  </Label>
                  <div className="col-span-3 space-y-3">
                    <p className="text-sm text-gray-600">Select companies this internal user can access:</p>
                    <div className="space-y-2">
                      {companies.map((company) => (
                        <div key={company.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`create-company-${company.id}`}
                            checked={createUserData.company_ids?.includes(company.id) || false}
                            onCheckedChange={(checked) => {
                              const currentIds = createUserData.company_ids || []
                              if (checked) {
                                setCreateUserData({
                                  ...createUserData,
                                  company_ids: [...currentIds, company.id],
                                  primary_company_id: !createUserData.primary_company_id ? company.id : createUserData.primary_company_id
                                })
                              } else {
                                setCreateUserData({
                                  ...createUserData,
                                  company_ids: currentIds.filter(id => id !== company.id),
                                  primary_company_id: createUserData.primary_company_id === company.id ? undefined : createUserData.primary_company_id
                                })
                              }
                            }}
                          />
                          <Label htmlFor={`create-company-${company.id}`} className="flex-1 cursor-pointer">
                            {company.name}
                          </Label>
                          {createUserData.company_ids?.includes(company.id) && (
                            <Checkbox
                              id={`create-primary-${company.id}`}
                              checked={createUserData.primary_company_id === company.id}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCreateUserData({
                                    ...createUserData,
                                    primary_company_id: company.id
                                  })
                                }
                              }}
                            />
                          )}
                          {createUserData.company_ids?.includes(company.id) && (
                            <Label htmlFor={`create-primary-${company.id}`} className="text-xs text-gray-500">
                              Primary
                            </Label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="company" className="text-right">
                    Company
                  </Label>
                  <Select
                    value={createUserData.company_id || 'none'}
                    onValueChange={(value) =>
                      setCreateUserData({ ...createUserData, company_id: value === 'none' ? undefined : value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a company (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Company</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Tab Permissions */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Tab Permissions
                </Label>
                <div className="col-span-3 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Select which tabs this user can access:</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCreateUserData({
                          ...createUserData,
                          tab_permissions: availableTabs.map(t => t.id)
                        })}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCreateUserData({
                          ...createUserData,
                          tab_permissions: []
                        })}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateUserData({
                        ...createUserData,
                        tab_permissions: ['projects', 'forms', 'services', 'calendar', 'chat']
                      })}
                    >
                      Basic Access
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateUserData({
                        ...createUserData,
                        tab_permissions: ['projects', 'forms', 'services', 'calendar', 'documents', 'chat']
                      })}
                    >
                      Manager Access
                    </Button>
                  </div>
                  {availableTabs.map((tab) => (
                    <div key={tab.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`create-${tab.id}`}
                        checked={createUserData.tab_permissions.includes(tab.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCreateUserData({
                              ...createUserData,
                              tab_permissions: [...createUserData.tab_permissions, tab.id]
                            })
                          } else {
                            setCreateUserData({
                              ...createUserData,
                              tab_permissions: createUserData.tab_permissions.filter(t => t !== tab.id)
                            })
                          }
                        }}
                      />
                      <Label htmlFor={`create-${tab.id}`} className="text-sm font-normal">
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-gray-500">{tab.description}</div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button variant="orange" type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_full_name" className="text-right">
                  Full Name
                </Label>
                <Input
                  id="edit_full_name"
                  value={editUserData.full_name}
                  onChange={(e) => setEditUserData({ ...editUserData, full_name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_role" className="text-right">
                  Role
                </Label>
                <Select
                  value={editUserData.role}
                  onValueChange={(value: 'admin' | 'manager' | 'user' | 'internal') =>
                    setEditUserData({ ...editUserData, role: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_status" className="text-right">
                  Status
                </Label>
                <Select
                  value={editUserData.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) =>
                    setEditUserData({ ...editUserData, is_active: value === 'active' })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editUserData.role === 'user' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_assigned_manager" className="text-right">
                    Assigned Manager
                  </Label>
                  <Select
                    value={editUserData.assigned_manager_id || 'none'}
                    onValueChange={(value) =>
                      setEditUserData({ ...editUserData, assigned_manager_id: value === 'none' ? undefined : value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a manager (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {users.filter(u => u.role === 'manager').map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Company Selection - Different for internal users */}
              {editUserData.role === 'internal' ? (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    Companies
                  </Label>
                  <div className="col-span-3 space-y-3">
                    <p className="text-sm text-gray-600">Select companies this internal user can access:</p>
                    <div className="space-y-2">
                      {companies.map((company) => (
                        <div key={company.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-company-${company.id}`}
                            checked={editUserData.company_ids?.includes(company.id) || false}
                            onCheckedChange={(checked) => {
                              const currentIds = editUserData.company_ids || []
                              if (checked) {
                                setEditUserData({
                                  ...editUserData,
                                  company_ids: [...currentIds, company.id],
                                  primary_company_id: !editUserData.primary_company_id ? company.id : editUserData.primary_company_id
                                })
                              } else {
                                setEditUserData({
                                  ...editUserData,
                                  company_ids: currentIds.filter(id => id !== company.id),
                                  primary_company_id: editUserData.primary_company_id === company.id ? undefined : editUserData.primary_company_id
                                })
                              }
                            }}
                          />
                          <Label htmlFor={`edit-company-${company.id}`} className="flex-1 cursor-pointer">
                            {company.name}
                          </Label>
                          {editUserData.company_ids?.includes(company.id) && (
                            <Checkbox
                              id={`edit-primary-${company.id}`}
                              checked={editUserData.primary_company_id === company.id}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setEditUserData({
                                    ...editUserData,
                                    primary_company_id: company.id
                                  })
                                }
                              }}
                            />
                          )}
                          {editUserData.company_ids?.includes(company.id) && (
                            <Label htmlFor={`edit-primary-${company.id}`} className="text-xs text-gray-500">
                              Primary
                            </Label>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_company" className="text-right">
                    Company
                  </Label>
                  <Select
                    value={editUserData.company_id || 'none'}
                    onValueChange={(value) =>
                      setEditUserData({ ...editUserData, company_id: value === 'none' ? undefined : value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a company (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Company</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Tab Permissions */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Tab Permissions
                </Label>
                <div className="col-span-3 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Select which tabs this user can access:</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditUserData({
                          ...editUserData,
                          tab_permissions: availableTabs.map(t => t.id)
                        })}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditUserData({
                          ...editUserData,
                          tab_permissions: []
                        })}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditUserData({
                        ...editUserData,
                        tab_permissions: ['projects', 'forms', 'services', 'calendar', 'chat']
                      })}
                    >
                      Basic Access
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditUserData({
                        ...editUserData,
                        tab_permissions: ['projects', 'forms', 'services', 'calendar', 'documents', 'chat']
                      })}
                    >
                      Manager Access
                    </Button>
                  </div>
                  {availableTabs.map((tab) => (
                    <div key={tab.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${tab.id}`}
                        checked={editUserData.tab_permissions.includes(tab.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditUserData({
                              ...editUserData,
                              tab_permissions: [...editUserData.tab_permissions, tab.id]
                            })
                          } else {
                            setEditUserData({
                              ...editUserData,
                              tab_permissions: editUserData.tab_permissions.filter(t => t !== tab.id)
                            })
                          }
                        }}
                      />
                      <Label htmlFor={`edit-${tab.id}`} className="text-sm font-normal">
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-gray-500">{tab.description}</div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
                         <DialogDescription>
               Are you sure you want to delete &quot;{selectedUser?.full_name}&quot;? This action cannot be undone.
             </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Invitation Modal */}
      <UserInvitationModal
        open={showInviteUsersModal}
        onOpenChange={setShowInviteUsersModal}
        companies={companies.map(c => ({ id: c.id, name: c.name }))}
        selectedCompanyId={selectedCompany || undefined}
      />
    </div>
  )
} 