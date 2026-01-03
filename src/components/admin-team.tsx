"use client"

import { Card } from "@/components/ui/card"
import { Users, Mail, Calendar, Plus, MoreHorizontal, Trash2, Edit, Download } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toastSuccess, toastError } from "@/lib/toast"
import { supabase } from "@/lib/supabase"

export function AdminTeam() {
  const { data: session } = useSession()
  const [team, setTeam] = useState<User[]>([])
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    email: "",
    role: "user" as "system_admin" | "admin" | "manager" | "user" | "internal",
    company_ids: [] as string[],
    primary_company_id: "" as string | undefined,
  })

  const loadTeamData = async () => {
    try {
      const users = await fetchUsersOptimized()
      const companiesData = await fetchCompaniesOptimized()
      setCompanies(companiesData)
      
      // Filter to internal team members (admins, managers, and internal users)
      const teamMembers = users.filter(u => 
        u.role === "admin" || 
        u.role === "manager" || 
        u.role === "internal"
      )
      
      // Enrich with client count
      const enrichedTeam = teamMembers.map(member => {
        const clientCount = member.company_id 
          ? 1 // If they have a company_id, they manage 1 client
          : companiesData.filter(c => c.is_active !== false).length // Admins see all clients
        return {
          ...member,
          clients: clientCount
        }
      })
      
      setTeam(enrichedTeam)
    } catch (error) {
      console.error("Error loading team:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await loadTeamData()
      } catch (error) {
        console.error("Error loading team:", error)
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
        const recentActivities = await fetchRecentActivities(10)
        setActivities(recentActivities)
      } catch (error) {
        console.error("Error loading activities:", error)
      } finally {
        setActivitiesLoading(false)
      }
    }

    loadActivities()
  }, [])

  // Format activity type for display
  const formatActivityType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Export activities to CSV
  const handleExportActivities = async () => {
    try {
      setActivitiesLoading(true)
      // Fetch all activities (or a large number) for export
      const allActivities = await fetchRecentActivities(10000, 365) // Get up to 10k activities from the last year
      
      if (allActivities.length === 0) {
        toastError("No activities to export")
        return
      }

      // Define CSV headers
      const headers = [
        "Timestamp",
        "User",
        "Activity Type",
        "Description",
        "Project",
        "Task",
        "Company"
      ]

      // Convert activities to CSV rows
      const rows = allActivities.map(activity => {
        const timestamp = new Date(activity.timestamp).toLocaleString()
        const user = activity.user_name || "Unknown"
        const activityType = formatActivityType(activity.type)
        const description = activity.description || activity.task_title || activity.project_name || ""
        const project = activity.project_name || ""
        const task = activity.task_title || ""
        const company = activity.company_name || ""

        return [
          timestamp,
          user,
          activityType,
          description,
          project,
          task,
          company
        ]
      })

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map(row => 
          row.map(cell => {
            // Escape commas and quotes in cell values
            const cellStr = String(cell || "")
            if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          }).join(",")
        )
      ].join("\n")

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      
      link.setAttribute("href", url)
      link.setAttribute("download", `team-activity-export-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toastSuccess(`Exported ${allActivities.length} activities`)
    } catch (error) {
      console.error("Error exporting activities:", error)
      toastError("Failed to export activities")
    } finally {
      setActivitiesLoading(false)
    }
  }

  const handleDeleteMember = async () => {
    if (!selectedMember) return

    // Prevent users from deleting themselves
    if (selectedMember.id === session?.user?.id) {
      toastError("You cannot delete your own account")
      setShowDeleteDialog(false)
      setSelectedMember(null)
      return
    }

    setDeleting(true)
    try {
      const result = await deleteUser(selectedMember.id)
      if (result.success) {
        toastSuccess("Team member deleted successfully")
        setShowDeleteDialog(false)
        setSelectedMember(null)
        
        // Reload team
        await loadTeamData()
      } else {
        toastError(result.error || "Failed to delete team member")
      }
    } catch (error) {
      console.error("Error deleting team member:", error)
      toastError("An error occurred while deleting the team member")
    } finally {
      setDeleting(false)
    }
  }

  const handleOpenEdit = async (member: User) => {
    setSelectedMember(member)
    
    // Get company assignments for internal users, admins, and managers
    let userCompanyIds: string[] = []
    let primaryCompanyId: string | undefined = undefined
    
    if ((member.role === "internal" || member.role === "admin" || member.role === "manager") && supabase) {
      try {
        const { data: assignments } = await supabase
          .from('internal_user_companies')
          .select('company_id, is_primary')
          .eq('user_id', member.id)
        
        if (assignments && assignments.length > 0) {
          userCompanyIds = assignments.map(a => a.company_id)
          const primaryAssignment = assignments.find(a => a.is_primary)
          if (primaryAssignment) {
            primaryCompanyId = primaryAssignment.company_id
          } else if (userCompanyIds.length > 0) {
            primaryCompanyId = userCompanyIds[0]
          }
        } else if (member.company_id) {
          // Fallback to single company_id if no assignments exist
          userCompanyIds = [member.company_id]
          primaryCompanyId = member.company_id
        }
      } catch (err) {
        console.error("Error fetching company assignments:", err)
        // Fallback to single company_id on error
        if (member.company_id) {
          userCompanyIds = [member.company_id]
          primaryCompanyId = member.company_id
        }
      }
    } else if (member.company_id) {
      userCompanyIds = [member.company_id]
      primaryCompanyId = member.company_id
    }
    
    setEditFormData({
      full_name: member.full_name || "",
      email: member.email,
      role: member.role,
      company_ids: userCompanyIds,
      primary_company_id: primaryCompanyId,
    })
    setShowEditDialog(true)
  }

  const handleEditSubmit = async () => {
    if (!selectedMember) return

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

      const result = await updateUser(selectedMember.id, userData)

      if (result.success) {
        toastSuccess("Team member updated successfully")
        setShowEditDialog(false)
        setSelectedMember(null)
        await loadTeamData()
      } else {
        toastError(result.error || "Failed to update team member")
      }
    } catch (error) {
      console.error("Error updating team member:", error)
      toastError("An error occurred while updating the team member")
    } finally {
      setEditing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading team...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg">Team Members</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {team.length} team members managing {team.reduce((sum, m) => sum + ((m as { clients?: number }).clients || 0), 0)} clients
          </p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowInviteModal(true)}
        >
          <Plus className="w-4 h-4" />
          Invite Team Member
        </Button>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-2 gap-4">
        {team.map((member) => (
          <Card key={member.id} className="p-4 border-border/60">
            <div className="flex items-start gap-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-muted">
                  {member.full_name?.split(' ').map((n: string) => n[0]).join('') || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm truncate">{member.full_name || member.email}</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {member.role === "admin" ? "Admin" : 
                       member.role === "manager" ? "Account Manager" : 
                       member.role === "internal" ? "Internal User" : 
                       "User"}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{((member as { clients?: number }).clients || 0)} {((member as { clients?: number }).clients || 0) === 1 ? 'client' : 'clients'}</span>
                      </div>
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
                        onClick={() => handleOpenEdit(member)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Member
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedMember(member)
                          setShowDeleteDialog(true)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Activity Log */}
      <Card className="p-4 border-border/60">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm">Recent Activity</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportActivities}
            disabled={activitiesLoading || activities.length === 0}
            className="h-7 text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
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
          <div className="space-y-3">
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
                      </>
                    )
                  case 'task_completed':
                    return (
                      <>
                        <span className="font-medium">{activity.user_name}</span>
                        <span className="text-muted-foreground"> completed task </span>
                        <span className="font-medium">{activity.task_title}</span>
                      </>
                    )
                  case 'comment_added':
                    return (
                      <>
                        <span className="font-medium">{activity.user_name}</span>
                        <span className="text-muted-foreground"> commented on </span>
                        <span className="font-medium">{activity.task_title}</span>
                      </>
                    )
                  default:
                    // Fallback to description field if available, otherwise show user name and activity type
                    if (activity.description) {
                      return (
                        <>
                          <span className="font-medium">{activity.user_name}</span>
                          <span className="text-muted-foreground"> {activity.description}</span>
                        </>
                      )
                    }
                    // If no description, show user name and formatted activity type
                    return (
                      <>
                        <span className="font-medium">{activity.user_name}</span>
                        <span className="text-muted-foreground"> performed {activity.type.replace(/_/g, ' ')}</span>
                      </>
                    )
                }
              }

              return (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                  <Avatar className="w-8 h-8">
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

      {/* Invite Team Member Modal */}
      <UserInvitationModal
        open={showInviteModal}
        onOpenChange={(open) => {
          setShowInviteModal(open)
          // Reload team when modal closes after successful invitation
          if (!open) {
            loadTeamData()
          }
        }}
        companies={companies.map(c => ({ id: c.id, name: c.name }))}
      />

      {/* Edit Member Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member information and space access
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
                setSelectedMember(null)
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
            <DialogTitle>Delete Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedMember?.full_name || selectedMember?.email}</strong>? 
              This action cannot be undone and will permanently remove them from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setSelectedMember(null)
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

