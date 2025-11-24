"use client"

import { Card } from "@/components/ui/card"
import { Users, Mail, Calendar, Plus, MoreHorizontal, Trash2, Edit, Search, Building2, Activity } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { fetchUsersOptimized, fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { fetchRecentActivities, type RecentActivity, deleteUser, updateUser } from "@/lib/database-functions"
import { User, Company } from "@/lib/supabase"
import { formatDistanceToNow } from "date-fns"
import UserInvitationModal from "@/components/modals/user-invitation-modal"
import { useSession } from "@/components/providers/session-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { toastSuccess, toastError } from "@/lib/toast"
import { supabase } from "@/lib/supabase"

export function AdminAllUsers() {
  const { data: session } = useSession()
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editing, setEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    email: "",
    role: "user" as "admin" | "manager" | "user" | "internal",
    company_ids: [] as string[],
    primary_company_id: "" as string | undefined,
  })

  const loadUsersData = async () => {
    try {
      const users = await fetchUsersOptimized()
      const companiesData = await fetchCompaniesOptimized()
      setCompanies(companiesData)
      setAllUsers(users)
      setFilteredUsers(users)
    } catch (error) {
      console.error("Error loading users:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await loadUsersData()
      } catch (error) {
        console.error("Error loading users:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    const loadActivities = async () => {
      setActivitiesLoading(true)
      try {
        // Fetch more activities for comprehensive feed (90 days back)
        const recentActivities = await fetchRecentActivities(50, 90)
        setActivities(recentActivities)
      } catch (error) {
        console.error("Error loading activities:", error)
      } finally {
        setActivitiesLoading(false)
      }
    }

    loadActivities()
    // Refresh activities every 30 seconds
    const interval = setInterval(loadActivities, 30000)
    return () => clearInterval(interval)
  }, [])

  // Filter users based on search and role
  useEffect(() => {
    let filtered = allUsers

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }, [searchTerm, roleFilter, allUsers])

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    // Prevent users from deleting themselves
    if (selectedUser.id === session?.user?.id) {
      toastError("You cannot delete your own account")
      setShowDeleteDialog(false)
      setSelectedUser(null)
      return
    }

    setDeleting(true)
    try {
      const result = await deleteUser(selectedUser.id)
      if (result.success) {
        toastSuccess("User deleted successfully")
        setShowDeleteDialog(false)
        setSelectedUser(null)
        await loadUsersData()
      } else {
        toastError(result.error || "Failed to delete user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toastError("An error occurred while deleting the user")
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenEdit = async (user: User) => {
    setSelectedUser(user)
    
    // Get company assignments for internal users, admins, and managers
    let userCompanyIds: string[] = []
    let primaryCompanyId: string | undefined = undefined
    
    if ((user.role === "internal" || user.role === "admin" || user.role === "manager") && supabase) {
      try {
        const { data: assignments } = await supabase
          .from('internal_user_companies')
          .select('company_id, is_primary')
          .eq('user_id', user.id)
        
        if (assignments && assignments.length > 0) {
          userCompanyIds = assignments.map(a => a.company_id)
          const primaryAssignment = assignments.find(a => a.is_primary)
          if (primaryAssignment) {
            primaryCompanyId = primaryAssignment.company_id
          } else if (userCompanyIds.length > 0) {
            primaryCompanyId = userCompanyIds[0]
          }
        } else if (user.company_id) {
          // Fallback to single company_id if no assignments exist
          userCompanyIds = [user.company_id]
          primaryCompanyId = user.company_id
        }
      } catch (err) {
        console.error("Error fetching company assignments:", err)
        // Fallback to single company_id on error
        if (user.company_id) {
          userCompanyIds = [user.company_id]
          primaryCompanyId = user.company_id
        }
      }
    } else if (user.company_id) {
      userCompanyIds = [user.company_id]
      primaryCompanyId = user.company_id
    }
    
    setEditFormData({
      full_name: user.full_name || "",
      email: user.email,
      role: user.role,
      company_ids: userCompanyIds,
      primary_company_id: primaryCompanyId,
    })
    setShowEditDialog(true)
  }

  const handleEditSubmit = async () => {
    if (!selectedUser) return

    if (!editFormData.full_name || !editFormData.email) {
      toastError("Name and email are required")
      return
    }

    setEditing(true)
    try {
      const userData: any = {
        email: editFormData.email,
        full_name: editFormData.full_name,
        role: editFormData.role,
        is_active: true,
        tab_permissions: [],
      }

      // For internal users, admins, and managers, handle company assignments
      if (editFormData.role === "internal" || editFormData.role === "admin" || editFormData.role === "manager") {
        userData.company_id = null
        if (editFormData.company_ids.length > 0) {
          userData.company_ids = editFormData.company_ids
          userData.primary_company_id = editFormData.primary_company_id || editFormData.company_ids[0]
        } else {
          userData.company_ids = []
        }
      } else {
        // For regular users, set single company_id
        userData.company_id = editFormData.company_ids.length > 0 ? editFormData.company_ids[0] : null
      }

      const result = await updateUser(selectedUser.id, userData)

      if (result.success) {
        toastSuccess("User updated successfully")
        setShowEditDialog(false)
        setSelectedUser(null)
        await loadUsersData()
      } else {
        toastError(result.error || "Failed to update user")
      }
    } catch (error) {
      console.error("Error updating user:", error)
      toastError("An error occurred while updating the user")
    } finally {
      setEditing(false)
    }
  }

  const getUserCompany = (user: User) => {
    if (user.company_id) {
      return companies.find(c => c.id === user.company_id)
    }
    return null
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default"
      case "manager":
        return "secondary"
      case "internal":
        return "outline"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg">All Users</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} • {activities.length} recent activities
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowInviteModal(true)}
        >
          <Plus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 border-border/60">
            <h3 className="text-sm font-semibold mb-4">User Profiles</h3>
            {filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground text-sm">No users found</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const userCompany = getUserCompany(user)
                  return (
                    <Card key={user.id} className="p-3 border-border/40 hover:border-border transition-colors">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-muted">
                            {user.full_name?.split(' ').map((n: string) => n[0]).join('') || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">{user.full_name || user.email}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                                  {user.role === "admin" ? "Admin" : 
                                   user.role === "manager" ? "Manager" : 
                                   user.role === "internal" ? "Internal" : 
                                   "User"}
                                </Badge>
                                {userCompany && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Building2 className="w-3 h-3" />
                                    <span className="truncate">{userCompany.name}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{user.email}</span>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleOpenEdit(user)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setShowDeleteDialog(true)
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <Card className="p-4 border-border/60">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Activity Feed</h3>
            </div>
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground text-sm">Loading activities...</div>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground text-sm">No recent activity</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
                {activities.map((activity) => {
                  const initials = activity.user_name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  const getActivityText = () => {
                    switch (activity.type) {
                      case 'project_created':
                        return (
                          <>
                            <span className="font-medium">{activity.user_name}</span>
                            <span className="text-muted-foreground"> created project </span>
                            <span className="font-medium">{activity.project_name}</span>
                            {activity.company_name && (
                              <>
                                <span className="text-muted-foreground"> for </span>
                                <span className="font-medium">{activity.company_name}</span>
                              </>
                            )}
                          </>
                        )
                      case 'task_created':
                        return (
                          <>
                            <span className="font-medium">{activity.user_name}</span>
                            <span className="text-muted-foreground"> created task </span>
                            <span className="font-medium">{activity.task_title}</span>
                            {activity.project_name && (
                              <>
                                <span className="text-muted-foreground"> in </span>
                                <span className="font-medium">{activity.project_name}</span>
                              </>
                            )}
                          </>
                        )
                      case 'task_completed':
                        return (
                          <>
                            <span className="font-medium">{activity.user_name}</span>
                            <span className="text-muted-foreground"> completed task </span>
                            <span className="font-medium">{activity.task_title}</span>
                            {activity.project_name && (
                              <>
                                <span className="text-muted-foreground"> in </span>
                                <span className="font-medium">{activity.project_name}</span>
                              </>
                            )}
                          </>
                        )
                      case 'comment_added':
                        return (
                          <>
                            <span className="font-medium">{activity.user_name}</span>
                            <span className="text-muted-foreground"> commented on </span>
                            <span className="font-medium">{activity.task_title}</span>
                            {activity.comment_content && (
                              <span className="text-muted-foreground text-xs block mt-1">
                                "{activity.comment_content.substring(0, 60)}{activity.comment_content.length > 60 ? '...' : ''}"
                              </span>
                            )}
                          </>
                        )
                      default:
                        return null
                    }
                  }

                  return (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-muted text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          {getActivityText()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Invite User Modal */}
      <UserInvitationModal
        open={showInviteModal}
        onOpenChange={(open) => {
          setShowInviteModal(open)
          if (!open) {
            loadUsersData()
          }
        }}
        companies={companies.map(c => ({ id: c.id, name: c.name }))}
      />

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and space access
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                placeholder="Enter full name"
                disabled={editing}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="email@example.com"
                disabled={editing}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value: "admin" | "manager" | "user" | "internal") => 
                  setEditFormData({ ...editFormData, role: value })
                }
                disabled={editing}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="internal">Internal User</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Space Access - Show for internal users, admins, and managers */}
            {(editFormData.role === "internal" || editFormData.role === "admin" || editFormData.role === "manager") && (
              <div className="space-y-3">
                <Label>Space Access</Label>
                <p className="text-sm text-muted-foreground">
                  Select which spaces this user can access. You can select multiple spaces.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {companies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No spaces available</p>
                  ) : (
                    companies.map((company) => (
                      <div key={company.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                        <Checkbox
                          id={`edit-company-${company.id}`}
                          checked={editFormData.company_ids.includes(company.id)}
                          onCheckedChange={(checked) => {
                            const currentIds = editFormData.company_ids || []
                            if (checked) {
                              const newIds = [...currentIds, company.id]
                              setEditFormData({
                                ...editFormData,
                                company_ids: newIds,
                                primary_company_id: !editFormData.primary_company_id ? company.id : editFormData.primary_company_id
                              })
                            } else {
                              const newIds = currentIds.filter(id => id !== company.id)
                              setEditFormData({
                                ...editFormData,
                                company_ids: newIds,
                                primary_company_id: editFormData.primary_company_id === company.id 
                                  ? (newIds.length > 0 ? newIds[0] : undefined)
                                  : editFormData.primary_company_id
                              })
                            }
                          }}
                          disabled={editing}
                        />
                        <Label 
                          htmlFor={`edit-company-${company.id}`} 
                          className="flex-1 cursor-pointer flex items-center justify-between"
                        >
                          <span>{company.name}</span>
                          {editFormData.company_ids.includes(company.id) && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`edit-primary-${company.id}`}
                                checked={editFormData.primary_company_id === company.id}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditFormData({
                                      ...editFormData,
                                      primary_company_id: company.id
                                    })
                                  }
                                }}
                                disabled={editing}
                              />
                              <Label 
                                htmlFor={`edit-primary-${company.id}`} 
                                className="text-xs text-muted-foreground cursor-pointer"
                              >
                                Primary
                              </Label>
                            </div>
                          )}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {editFormData.company_ids.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No spaces selected. User will have access to all spaces.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false)
                setSelectedUser(null)
              }}
              disabled={editing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={editing || !editFormData.full_name || !editFormData.email}
            >
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.full_name || selectedUser?.email}</strong>? 
              This action cannot be undone and will permanently remove them from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setSelectedUser(null)
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

