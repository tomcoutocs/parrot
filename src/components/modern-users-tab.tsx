"use client"

import { useState, useEffect } from "react"
import { UserPlus, Search, MoreHorizontal, Shield, User as UserIcon, Edit, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchUsersOptimized, fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { fetchCompanyUsers } from "@/lib/company-detail-functions"
import { User, Company } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { updateUser, deleteUser, assignCompanyToInternalUser } from "@/lib/database-functions"
import { toastSuccess, toastError } from "@/lib/toast"
import { useSession } from "@/components/providers/session-provider"
import { LoadingSpinner } from "@/components/ui/loading-states"

interface ModernUsersTabProps {
  activeSpace?: string | null
}

export function ModernUsersTab({ activeSpace }: ModernUsersTabProps) {
  const { data: session } = useSession()
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isAddExistingUserOpen, setIsAddExistingUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedExistingUserIds, setSelectedExistingUserIds] = useState<string[]>([])
  const [addingUsers, setAddingUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "internal" | "client">("all")
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "manager" | "user">("all")
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  // Form state for creating users
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user" as "admin" | "manager" | "user",
    type: "client" as "internal" | "client",
    spaces: [] as string[],
  })

  // When dialog opens and activeSpace is set, default to that space and client type
  useEffect(() => {
    if (isAddUserOpen && activeSpace) {
      setFormData(prev => ({
        ...prev,
        type: "client",
        spaces: [activeSpace]
      }))
    } else if (!isAddUserOpen) {
      // Reset form when dialog closes
      setFormData({
        name: "",
        email: "",
        role: "user",
        type: "client",
        spaces: [],
      })
    }
  }, [isAddUserOpen, activeSpace])

  // Form state for editing users
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "user" as "admin" | "manager" | "user" | "internal",
    type: "client" as "internal" | "client",
    spaces: [] as string[],
  })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Load companies and users in parallel
        const [companiesData, allUsers] = await Promise.all([
          fetchCompaniesOptimized(),
          activeSpace ? Promise.resolve([]) : fetchUsersOptimized() // Only fetch all users if no activeSpace
        ])
        
        // If we have an activeSpace, fetch users for that specific company
        let filteredUsers: User[] = []
        if (activeSpace) {
          // Fetch company users and internal user assignments in parallel
          const [companyUsersResult, internalAssignmentsResult] = await Promise.all([
            fetchCompanyUsers(activeSpace).catch(() => []),
            supabase ? (async () => {
              try {
                // Try space_id first (after migration), fallback to company_id
                let result = await supabase
                  .from('internal_user_companies')
                  .select('user_id')
                  .eq('space_id', activeSpace)
                
                // If space_id column doesn't exist (migration not run), try company_id
                if (result.error && (result.error.message?.includes('does not exist') || result.error.message?.includes('column') || (result.error as any).code === '42703')) {
                  const fallback = await supabase
                    .from('internal_user_companies')
                    .select('user_id')
                    .eq('company_id', activeSpace)
                  
                  if (!fallback.error) {
                    result = fallback
                  }
                }
                return result
              } catch {
                return { data: null, error: null }
              }
            })() : Promise.resolve({ data: null, error: null })
          ])
          
          // Filter to only active users
          const companyUsers = (Array.isArray(companyUsersResult) ? companyUsersResult : []).filter(user => user.is_active !== false)
          
          // Get internal user IDs
          const internalUserIds: string[] = []
          if (internalAssignmentsResult && !internalAssignmentsResult.error && internalAssignmentsResult.data) {
            internalUserIds.push(...internalAssignmentsResult.data.map((assignment: { user_id: string }) => assignment.user_id))
          }
          
          // Only fetch all users if we need to get internal users
          if (internalUserIds.length > 0) {
            const allUsersData = await fetchUsersOptimized()
            const internalUsers = allUsersData.filter(user => internalUserIds.includes(user.id))
            
            // Combine company users and internal users, removing duplicates
            const allSpaceUsers = [...companyUsers, ...internalUsers]
            filteredUsers = allSpaceUsers.filter((user, index, self) => 
              index === self.findIndex(u => u.id === user.id)
            )
          } else {
            filteredUsers = companyUsers
          }
        } else {
          // No activeSpace - show all users
          filteredUsers = allUsers
        }
        
        setUsers(filteredUsers)
        setCompanies(companiesData)
      } catch (error) {
        console.error("ModernUsersTab: Error loading users:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeSpace])

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: "bg-red-50 text-red-700 border-red-200",
      manager: "bg-blue-50 text-blue-700 border-blue-200",
      user: "bg-muted text-muted-foreground border-border",
    }
    return variants[role as keyof typeof variants] || variants.user
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-3 h-3" />
      case "manager":
        return <UserIcon className="w-3 h-3" />
      default:
        return <UserIcon className="w-3 h-3" />
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    // Prevent users from deleting themselves
    if (selectedUser.id === session?.user?.id) {
      toastError("You cannot delete your own account")
      return
    }

    setDeleting(true)
    try {
      const result = await deleteUser(selectedUser.id)
      if (result.success) {
        toastSuccess("User deleted successfully")
        setIsDeleteDialogOpen(false)
        setSelectedUser(null)
        
        // Reload users
        setLoading(true)
        try {
          const companiesData = await fetchCompaniesOptimized()
          
          if (activeSpace) {
            const companyUsers = (await fetchCompanyUsers(activeSpace)).filter(user => user.is_active !== false)
            const allUsers = await fetchUsersOptimized()
            
            let internalUserIds: string[] = []
            if (supabase) {
              try {
                // Try space_id first (after migration), fallback to company_id
                let { data: internalAssignments } = await supabase
                  .from('internal_user_companies')
                  .select('user_id')
                  .eq('space_id', activeSpace)
                
                // If space_id column doesn't exist (migration not run), try company_id
                if (!internalAssignments || (internalAssignments as any).error) {
                  const fallback = await supabase
                    .from('internal_user_companies')
                    .select('user_id')
                    .eq('company_id', activeSpace)
                  
                  if (!fallback.error && fallback.data) {
                    internalAssignments = fallback.data
                  }
                }
                
                if (internalAssignments) {
                  internalUserIds = internalAssignments.map(assignment => assignment.user_id)
                }
              } catch (err) {
                console.error("Error fetching internal user assignments:", err)
              }
            }
            
            const internalUsers = allUsers.filter(user => internalUserIds.includes(user.id))
            const allSpaceUsers = [...companyUsers, ...internalUsers]
            const filteredUsers = allSpaceUsers.filter((user, index, self) => 
              index === self.findIndex(u => u.id === user.id)
            )
            setUsers(filteredUsers)
          } else {
            const allUsers = await fetchUsersOptimized()
            setUsers(allUsers)
          }
          setCompanies(companiesData)
        } catch (error) {
          console.error("Error loading users:", error)
        } finally {
          setLoading(false)
        }
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser || !editFormData.name || !editFormData.email) {
      console.error("Name and email are required")
      return
    }

    try {
      // Prepare user data based on type
      const userData: any = {
        email: editFormData.email,
        full_name: editFormData.name,
        role: editFormData.role,
        is_active: true,
        tab_permissions: []
      }

      // Set company_id for client users
      if (editFormData.type === "client" && editFormData.spaces.length > 0) {
        userData.company_id = editFormData.spaces[0]
      } else {
        userData.company_id = null
      }

      // For internal users, handle company assignments if needed
      if (editFormData.type === "internal") {
        if (editFormData.spaces.length > 0) {
          userData.role = "internal"
          userData.company_ids = editFormData.spaces
          userData.primary_company_id = editFormData.spaces[0]
        }
      }

      console.log("Updating user:", userData)

      // Call updateUser function
      const result = await updateUser(selectedUser.id, userData)

      if (result.success) {
        toastSuccess('User updated successfully')
        setIsEditUserOpen(false)
        setSelectedUser(null)
        setEditFormData({
          name: "",
          email: "",
          role: "user",
          type: "client",
          spaces: [],
        })
        
        // Reload users
        const companiesData = await fetchCompaniesOptimized()
        setCompanies(companiesData)
        
        // Reload users based on activeSpace
        if (activeSpace) {
          const companyUsers = (await fetchCompanyUsers(activeSpace)).filter(user => user.is_active !== false)
          const allUsers = await fetchUsersOptimized()
          
          let internalUserIds: string[] = []
          if (supabase) {
            try {
              const { data: internalAssignments } = await supabase
                .from('internal_user_companies')
                .select('user_id')
                .eq('company_id', activeSpace)
              
              if (internalAssignments) {
                internalUserIds = internalAssignments.map(assignment => assignment.user_id)
              }
            } catch (err) {
              console.error("Error fetching internal user assignments:", err)
            }
          }
          
          const internalUsers = allUsers.filter(user => internalUserIds.includes(user.id))
          const allSpaceUsers = [...companyUsers, ...internalUsers]
          const filteredUsers = allSpaceUsers.filter((user, index, self) => 
            index === self.findIndex(u => u.id === user.id)
          )
          setUsers(filteredUsers)
        } else {
          const allUsers = await fetchUsersOptimized()
          setUsers(allUsers)
        }
      } else {
        console.error("Failed to update user:", result.error)
        toastError(result.error || 'Failed to update user')
      }
    } catch (error) {
      console.error("Error updating user:", error)
      toastError('An error occurred while updating the user', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const loadAvailableUsers = async () => {
    if (!activeSpace) return
    
    try {
      // Get all users
      const allUsers = await fetchUsersOptimized()
      
      // Get current users in the space
      const companyUsers = (await fetchCompanyUsers(activeSpace)).filter(user => user.is_active !== false)
      let internalUserIds: string[] = []
      if (supabase) {
        try {
          const { data: internalAssignments } = await supabase
            .from('internal_user_companies')
            .select('user_id')
            .eq('company_id', activeSpace)
          
          if (internalAssignments) {
            internalUserIds = internalAssignments.map(assignment => assignment.user_id)
          }
        } catch (err) {
          console.error("Error fetching internal user assignments:", err)
        }
      }
      
      const currentUserIds = new Set([
        ...companyUsers.map(u => u.id),
        ...internalUserIds
      ])
      
      // Filter to only managers and internal users who are not already in the space
      const available = allUsers.filter(user => 
        (user.role === 'manager' || user.role === 'internal') &&
        !currentUserIds.has(user.id) &&
        user.is_active !== false
      )
      
      setAvailableUsers(available)
    } catch (error) {
      console.error("Error loading available users:", error)
      setAvailableUsers([])
    }
  }

  const handleAddExistingUsers = async () => {
    if (!activeSpace || selectedExistingUserIds.length === 0) return

    setAddingUsers(true)
    try {
      for (const userId of selectedExistingUserIds) {
        const user = availableUsers.find(u => u.id === userId)
        if (!user) continue

        if (user.role === 'internal') {
          // For internal users, add to internal_user_companies table
          await assignCompanyToInternalUser(userId, activeSpace, false)
        } else if (user.role === 'manager') {
          // For managers, update company_id using updateUser
          await updateUser(userId, {
            email: user.email,
            full_name: user.full_name || '',
            role: user.role as 'admin' | 'manager' | 'user' | 'internal',
            is_active: user.is_active !== false,
            company_id: activeSpace,
            assigned_manager_id: user.assigned_manager_id || undefined,
            tab_permissions: user.tab_permissions || []
          })
        }
      }

      toastSuccess(`Successfully added ${selectedExistingUserIds.length} user${selectedExistingUserIds.length !== 1 ? 's' : ''} to the space`)
      setIsAddExistingUserOpen(false)
      setSelectedExistingUserIds([])
      
      // Reload users
      const companiesData = await fetchCompaniesOptimized()
      setCompanies(companiesData)
      
      if (activeSpace) {
        const companyUsers = (await fetchCompanyUsers(activeSpace)).filter(user => user.is_active !== false)
        const allUsers = await fetchUsersOptimized()
        
        let internalUserIds: string[] = []
        if (supabase) {
          try {
            const { data: internalAssignments } = await supabase
              .from('internal_user_companies')
              .select('user_id')
              .eq('company_id', activeSpace)
            
            if (internalAssignments) {
              internalUserIds = internalAssignments.map(assignment => assignment.user_id)
            }
          } catch (err) {
            console.error("Error fetching internal user assignments:", err)
          }
        }
        
        const internalUsers = allUsers.filter(user => internalUserIds.includes(user.id))
        const allSpaceUsers = [...companyUsers, ...internalUsers]
        const filteredUsers = allSpaceUsers.filter((user, index, self) => 
          index === self.findIndex(u => u.id === user.id)
        )
        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error('Error adding existing users:', error)
      toastError('An error occurred while adding users')
    } finally {
      setAddingUsers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      toastError("Name and email are required")
      return
    }

    if (!session?.user?.id) {
      toastError("You must be logged in to send invitations")
      return
    }

    // Determine company_id based on user type and spaces
    let companyId: string | null = null
    if (formData.type === "client" && formData.spaces.length > 0) {
      companyId = formData.spaces[0]
    } else if (formData.type === "internal" && formData.spaces.length > 0) {
      // For internal users, use the first space as the primary company
      companyId = formData.spaces[0]
    } else if (activeSpace) {
      // If no space selected but we're in a space context, use that
      companyId = activeSpace
    }

    // Require a company_id for invitations
    if (!companyId) {
      toastError("Please select a space for this user")
      return
    }

    // Determine role
    let role: 'admin' | 'manager' | 'user' | 'internal' = formData.role
    if (formData.type === "internal") {
      role = "internal"
    }

    try {
      // Use invitation API instead of direct user creation
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.name,
          company_id: companyId,
          role: role,
          invited_by: session.user.id,
          tab_permissions: [],
          company_name: companies.find(c => c.id === companyId)?.name || (activeSpace ? companies.find(c => c.id === activeSpace)?.name : 'Company'),
          inviter_name: session.user.name || 'Administrator'
        }),
      })

      const result = await response.json()

      if (result.success) {
        toastSuccess("Invitation sent successfully! The user will receive an email to sign in.")
        setIsAddUserOpen(false)
        setFormData({
          name: "",
          email: "",
          role: "user",
          type: "client",
          spaces: [],
        })
        
        // Reload users to show any pending invitations
        const companiesData = await fetchCompaniesOptimized()
        setCompanies(companiesData)
        
        // Reload users based on activeSpace
        if (activeSpace) {
          const companyUsers = (await fetchCompanyUsers(activeSpace)).filter(user => user.is_active !== false)
          const allUsers = await fetchUsersOptimized()
          
          let internalUserIds: string[] = []
          if (supabase) {
            try {
              const { data: internalAssignments } = await supabase
                .from('internal_user_companies')
                .select('user_id')
                .eq('company_id', activeSpace)
              
              if (internalAssignments) {
                internalUserIds = internalAssignments.map(assignment => assignment.user_id)
              }
            } catch (err) {
              console.error("Error fetching internal user assignments:", err)
            }
          }
          
          const internalUsers = allUsers.filter(user => internalUserIds.includes(user.id))
          const allSpaceUsers = [...companyUsers, ...internalUsers]
          const filteredUsers = allSpaceUsers.filter((user, index, self) => 
            index === self.findIndex(u => u.id === user.id)
          )
          setUsers(filteredUsers)
        } else {
          const allUsers = await fetchUsersOptimized()
          setUsers(allUsers)
        }
      } else {
        toastError(result.error || "Failed to send invitation")
      }
    } catch (error) {
      console.error("Error sending invitation:", error)
      toastError("An error occurred while sending the invitation")
    }
  }

  const filteredUsers = users.filter(user => {
    const name = user.full_name || user.email || ""
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const userType = user.role === "admin" ? "internal" : (user.company_id ? "client" : "internal")
    const matchesType = filterType === "all" || userType === filterType
    const matchesRole = filterRole === "all" || user.role === filterRole
    return matchesSearch && matchesType && matchesRole
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserIcon className="w-6 h-6 text-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-3.5 h-3.5" />
                Add User
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account for team members or clients
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {/* User Type & Role */}
              <div className={`grid gap-4 ${activeSpace ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {!activeSpace && (
                  <div className="space-y-2">
                    <Label htmlFor="type">User Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "internal" | "client") => 
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal Team</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {activeSpace && (
                  <div className="space-y-2">
                    <Label htmlFor="type">User Type</Label>
                    <Input
                      id="type"
                      value="Client"
                      disabled
                      className="bg-muted"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "admin" | "manager" | "user") => 
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Space Access */}
              {formData.type === "client" && (
                <div className="space-y-2">
                  <Label htmlFor="spaces">Space Access</Label>
                  {activeSpace ? (
                    <Input
                      id="spaces"
                      value={companies.find(c => c.id === activeSpace)?.name || "Selected Space"}
                      disabled
                      className="bg-muted"
                    />
                  ) : (
                    <Select
                      value={formData.spaces[0] || ""}
                      onValueChange={(value) => 
                        setFormData({ ...formData, spaces: [value] })
                      }
                    >
                      <SelectTrigger id="spaces">
                        <SelectValue placeholder="Select a space" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            <div className="flex items-center gap-2">
                              {company.is_active !== false && (
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                              )}
                              {company.is_active === false && (
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                              )}
                              {company.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Client users can only access assigned spaces
                  </p>
                </div>
              )}

              {/* Role Descriptions */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Admin:</span> Full access to all features and settings
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Manager:</span> Can manage projects and users within assigned spaces
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">User:</span> View and collaborate on assigned projects
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddUserOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Create User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {activeSpace && (
          <Dialog 
            open={isAddExistingUserOpen} 
            onOpenChange={(open) => {
              setIsAddExistingUserOpen(open)
              if (open) {
                // Load available users when dialog opens
                loadAvailableUsers()
              } else {
                setSelectedExistingUserIds([])
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus className="w-3.5 h-3.5" />
                Add Existing User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Existing Users</DialogTitle>
                <DialogDescription>
                  Select existing internal users and managers to add to this space
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Managers */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Managers</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-border/60 rounded-md p-2">
                    {availableUsers.filter(user => user.role === 'manager').length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No managers available</p>
                    ) : (
                      availableUsers
                        .filter(user => user.role === 'manager')
                        .map(user => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`existing-user-${user.id}`}
                              checked={selectedExistingUserIds.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedExistingUserIds([...selectedExistingUserIds, user.id])
                                } else {
                                  setSelectedExistingUserIds(selectedExistingUserIds.filter(id => id !== user.id))
                                }
                              }}
                            />
                            <Label
                              htmlFor={`existing-user-${user.id}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {user.full_name || user.email || "Unknown"}
                            </Label>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Internal Users */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Internal Users</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-border/60 rounded-md p-2">
                    {availableUsers.filter(user => user.role === 'internal').length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No internal users available</p>
                    ) : (
                      availableUsers
                        .filter(user => user.role === 'internal')
                        .map(user => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`existing-user-${user.id}`}
                              checked={selectedExistingUserIds.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedExistingUserIds([...selectedExistingUserIds, user.id])
                                } else {
                                  setSelectedExistingUserIds(selectedExistingUserIds.filter(id => id !== user.id))
                                }
                              }}
                            />
                            <Label
                              htmlFor={`existing-user-${user.id}`}
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              {user.full_name || user.email || "Unknown"}
                            </Label>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddExistingUserOpen(false)
                    setSelectedExistingUserIds([])
                  }}
                  disabled={addingUsers}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAddExistingUsers}
                  disabled={addingUsers || selectedExistingUserIds.length === 0}
                >
                  {addingUsers ? "Adding..." : `Add ${selectedExistingUserIds.length} User${selectedExistingUserIds.length !== 1 ? 's' : ''}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={(v: string) => setFilterType(v as "internal" | "all" | "client")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={(v: string) => setFilterRole(v as "all" | "admin" | "manager" | "user")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card className="border-border/60 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 border-b border-border/40 text-xs text-muted-foreground">
          <div className="col-span-5">User</div>
          <div className="col-span-2 text-center">Role</div>
          <div className="col-span-4 text-center">Spaces</div>
          <div className="col-span-1 text-center">Status</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border/40">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const userCompany = companies.find(c => c.id === user.company_id)
              
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/20 transition-colors items-center group"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-muted text-xs">
                        {(user.full_name || user.email || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{user.full_name || user.email || "Unknown"}</p>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-center">
                    <Badge variant="outline" className={`gap-1 ${getRoleBadge(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="capitalize">{user.role}</span>
                    </Badge>
                  </div>

                  <div className="col-span-4 flex items-center justify-center">
                    {userCompany ? (
                      <span className="text-xs text-muted-foreground">{userCompany.name}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">All spaces</span>
                    )}
                  </div>

                  <div className="col-span-1 flex items-center justify-center relative">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="absolute right-0 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={async () => {
                            setSelectedUser(user)
                            
                            // Get company assignments for internal users
                            let userSpaces: string[] = []
                            if (user.role === "internal" && supabase) {
                              try {
                                const { data: assignments } = await supabase
                                  .from('internal_user_companies')
                                  .select('company_id')
                                  .eq('user_id', user.id)
                                
                                if (assignments) {
                                  userSpaces = assignments.map(a => a.company_id)
                                }
                              } catch (err) {
                                console.error("Error fetching company assignments:", err)
                              }
                            } else if (user.company_id) {
                              userSpaces = [user.company_id]
                            }
                            
                            setEditFormData({
                              name: user.full_name || "",
                              email: user.email,
                              role: user.role,
                              type: user.role === "internal" ? "internal" : (user.company_id ? "client" : "internal"),
                              spaces: userSpaces,
                            })
                            setIsEditUserOpen(true)
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user)
                            setIsDeleteDialogOpen(true)
                          }}
                          disabled={user.id === session?.user?.id}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Stats Footer */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>{filteredUsers.length} users shown</span>
        <span>•</span>
        <span>{users.filter(u => u.role === "admin").length} internal team members</span>
        <span>•</span>
        <span>{users.filter(u => u.company_id).length} client users</span>
      </div>

      {/* Edit User Modal */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user account information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5 mt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter full name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="email@example.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />
            </div>

            {/* User Type & Role */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">User Type</Label>
                <Select
                  value={editFormData.type}
                  onValueChange={(value: "internal" | "client") => 
                    setEditFormData({ ...editFormData, type: value })
                  }
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal Team</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value: "admin" | "manager" | "user" | "internal") => 
                    setEditFormData({ ...editFormData, role: value })
                  }
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    {editFormData.type === "internal" && (
                      <SelectItem value="internal">Internal</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Space Access */}
            {editFormData.type === "client" && (
              <div className="space-y-2">
                <Label htmlFor="edit-spaces">Space Access</Label>
                <Select
                  value={editFormData.spaces[0] || ""}
                  onValueChange={(value) => 
                    setEditFormData({ ...editFormData, spaces: [value] })
                  }
                >
                  <SelectTrigger id="edit-spaces">
                    <SelectValue placeholder="Select a space" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        <div className="flex items-center gap-2">
                          {company.is_active !== false && (
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                          )}
                          {company.is_active === false && (
                            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                          )}
                          {company.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Client users can only access assigned spaces
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditUserOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.full_name || selectedUser?.email}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedUser(null)
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting || selectedUser?.id === session?.user?.id}
            >
              {deleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

