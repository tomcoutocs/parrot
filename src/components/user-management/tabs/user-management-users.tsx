"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/session-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Search, 
  Mail,
  Shield,
  UserCheck,
  MoreVertical,
  Edit,
  Trash2,
  Key,
  Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { hasAdminPrivileges, hasSystemAdminPrivileges, canManageAdmins } from '@/lib/role-helpers'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { fetchUsers, updateUser, deleteUser } from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'
import type { User as DatabaseUser } from '@/lib/supabase'

interface User {
  id: string
  name: string
  email: string
  role: 'system_admin' | 'admin' | 'manager' | 'user' | 'internal'
  status: 'active' | 'inactive'
  lastLogin: string
  appPermissions: {
    crm: boolean
    invoicing: boolean
    leadGeneration: boolean
    analytics: boolean
  }
  avatar?: string
}

export function UserManagementUsers() {
  const router = useRouter()
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'internal' as 'system_admin' | 'admin' | 'manager' | 'user' | 'internal',
    status: 'active' as 'active' | 'inactive'
  })

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
      const mappedUsers: User[] = teamUsers.map((dbUser: DatabaseUser) => {
        // Determine app permissions from tab_permissions
        const tabPermissions = dbUser.tab_permissions || []
        const appPermissions = {
          crm: tabPermissions.includes('crm') || hasAdminPrivileges(dbUser.role),
          invoicing: tabPermissions.includes('invoicing') || hasAdminPrivileges(dbUser.role),
          leadGeneration: tabPermissions.includes('lead-generation') || hasAdminPrivileges(dbUser.role),
          analytics: tabPermissions.includes('analytics') || hasAdminPrivileges(dbUser.role),
        }

        return {
          id: dbUser.id,
          name: dbUser.full_name,
          email: dbUser.email,
          role: dbUser.role,
          status: dbUser.is_active ? 'active' : 'inactive',
          lastLogin: dbUser.updated_at ? new Date(dbUser.updated_at).toLocaleDateString() : 'Never',
          appPermissions,
          avatar: dbUser.profile_picture,
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

  useEffect(() => {
    loadUsers()
  }, [])

  const handleEditUser = (user: User) => {
    // Only system_admin can edit admin users
    if (user.role === 'admin' && !hasSystemAdminPrivileges(session?.user?.role)) {
      toastError('Only system administrators can manage admin users')
      return
    }
    
    setSelectedUser(user)
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return

    // Only system_admin can edit admin users or change users to admin
    if ((selectedUser.role === 'admin' || editFormData.role === 'admin') && !hasSystemAdminPrivileges(session?.user?.role)) {
      toastError('Only system administrators can manage admin users')
      setShowEditModal(false)
      return
    }

    setEditing(true)
    try {
      const result = await updateUser(selectedUser.id, {
        email: editFormData.email,
        full_name: editFormData.name,
        role: editFormData.role,
        is_active: editFormData.status === 'active'
      })

      if (result.success) {
        toastSuccess('User updated successfully')
        setShowEditModal(false)
        setSelectedUser(null)
        await loadUsers()
      } else {
        toastError(result.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toastError('An error occurred while updating the user')
    } finally {
      setEditing(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    // Only system_admin can delete admin users
    if (selectedUser.role === 'admin' && !hasSystemAdminPrivileges(session?.user?.role)) {
      toastError('Only system administrators can delete admin users')
      setShowDeleteDialog(false)
      setSelectedUser(null)
      return
    }

    // Prevent users from deleting themselves
    if (selectedUser.id === session?.user?.id) {
      toastError('You cannot delete your own account')
      setShowDeleteDialog(false)
      setSelectedUser(null)
      return
    }

    setDeleting(true)
    try {
      const result = await deleteUser(selectedUser.id)
      if (result.success) {
        toastSuccess('User deleted successfully')
        setShowDeleteDialog(false)
        setSelectedUser(null)
        await loadUsers()
      } else {
        toastError(result.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toastError('An error occurred while deleting the user')
    } finally {
      setDeleting(false)
    }
  }

  const handleManagePermissions = (user: User) => {
    // Store user ID in localStorage for permissions tab to pick up
    localStorage.setItem('selectedUserId', user.id)
    router.push('/apps/user-management?tab=permissions')
  }

  const handleResetPassword = (user: User) => {
    setSelectedUser(user)
    setShowResetPasswordDialog(true)
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400'
      case 'internal':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'user':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const adminUsers = filteredUsers.filter(u => u.role === 'admin')
  const internalUsers = filteredUsers.filter(u => u.role === 'internal')
  const managerUsers = filteredUsers.filter(u => u.role === 'manager')

  return (
    <div className="space-y-6">
      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({filteredUsers.length})</TabsTrigger>
              <TabsTrigger value="admin">Admin ({adminUsers.length})</TabsTrigger>
              <TabsTrigger value="internal">Internal ({internalUsers.length})</TabsTrigger>
              <TabsTrigger value="manager">Managers ({managerUsers.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <UserList 
                users={filteredUsers} 
                getRoleColor={getRoleColor} 
                getStatusColor={getStatusColor}
                onEdit={handleEditUser}
                onDelete={(user) => {
                  setSelectedUser(user)
                  setShowDeleteDialog(true)
                }}
                onManagePermissions={handleManagePermissions}
                onResetPassword={handleResetPassword}
              />
            </TabsContent>
            <TabsContent value="admin" className="mt-4">
              <UserList 
                users={adminUsers} 
                getRoleColor={getRoleColor} 
                getStatusColor={getStatusColor}
                onEdit={handleEditUser}
                onDelete={(user) => {
                  setSelectedUser(user)
                  setShowDeleteDialog(true)
                }}
                onManagePermissions={handleManagePermissions}
                onResetPassword={handleResetPassword}
              />
            </TabsContent>
            <TabsContent value="internal" className="mt-4">
              <UserList 
                users={internalUsers} 
                getRoleColor={getRoleColor} 
                getStatusColor={getStatusColor}
                onEdit={handleEditUser}
                onDelete={(user) => {
                  setSelectedUser(user)
                  setShowDeleteDialog(true)
                }}
                onManagePermissions={handleManagePermissions}
                onResetPassword={handleResetPassword}
              />
            </TabsContent>
            <TabsContent value="manager" className="mt-4">
              <UserList 
                users={managerUsers} 
                getRoleColor={getRoleColor} 
                getStatusColor={getStatusColor}
                onEdit={handleEditUser}
                onDelete={(user) => {
                  setSelectedUser(user)
                  setShowDeleteDialog(true)
                }}
                onManagePermissions={handleManagePermissions}
                onResetPassword={handleResetPassword}
              />
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_name" className="text-right">
                Name
              </Label>
              <Input
                id="edit_name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_email" className="text-right">
                Email
              </Label>
              <Input
                id="edit_email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_role" className="text-right">
                Role
              </Label>
              <Select
                value={editFormData.role}
                onValueChange={(value: 'admin' | 'manager' | 'user' | 'internal') =>
                  setEditFormData({ ...editFormData, role: value })
                }
                disabled={!hasSystemAdminPrivileges(session?.user?.role) && (selectedUser?.role === 'admin' || editFormData.role === 'admin')}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hasSystemAdminPrivileges(session?.user?.role) && (
                    <SelectItem value="admin">Admin</SelectItem>
                  )}
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_status" className="text-right">
                Status
              </Label>
              <Select
                value={editFormData.status}
                onValueChange={(value: 'active' | 'inactive') =>
                  setEditFormData({ ...editFormData, status: value })
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={editing}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editing}>
              {editing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setSelectedUser(null)
        }}
        onConfirm={handleDeleteUser}
        itemName={selectedUser?.name || 'user'}
        isLoading={deleting}
      />

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Password reset functionality is not yet implemented. Users can reset their passwords through the authentication system.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              To reset a user&apos;s password, they should use the &quot;Forgot Password&quot; feature on the sign-in page, or contact your system administrator.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResetPasswordDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UserList({ 
  users, 
  getRoleColor, 
  getStatusColor,
  onEdit,
  onDelete,
  onManagePermissions,
  onResetPassword
}: { 
  users: User[]
  getRoleColor: (role: string) => string
  getStatusColor: (status: string) => string
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onManagePermissions: (user: User) => void
  onResetPassword: (user: User) => void
}) {
  if (users.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No users found</div>
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-4 flex-1">
            <Avatar>
              <AvatarImage src={user.avatar} />
              <AvatarFallback>
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{user.name}</h3>
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
                <Badge className={getStatusColor(user.status)}>
                  {user.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Last login: {user.lastLogin}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Apps:</span>
                  {user.appPermissions.crm && <Badge variant="outline" className="text-xs">CRM</Badge>}
                  {user.appPermissions.invoicing && <Badge variant="outline" className="text-xs">Invoicing</Badge>}
                  {user.appPermissions.leadGeneration && <Badge variant="outline" className="text-xs">Lead Gen</Badge>}
                  {user.appPermissions.analytics && <Badge variant="outline" className="text-xs">Analytics</Badge>}
                </div>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => onEdit(user)}
                disabled={user.role === 'admin' && !canManageAdmins}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManagePermissions(user)}>
                <Key className="w-4 h-4 mr-2" />
                Manage Permissions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onResetPassword(user)}>
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => onDelete(user)}
                disabled={user.role === 'admin' && !canManageAdmins}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}

