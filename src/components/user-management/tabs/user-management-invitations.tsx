"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  Filter,
  Mail,
  X,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { getPendingInvitations, cancelInvitation } from '@/lib/database-functions'
import { fetchCompaniesOptimized } from '@/lib/optimized-database-functions'
import type { UserInvitation } from '@/lib/supabase'

interface InvitationUser {
  email: string
  full_name: string
  role: 'system_admin' | 'admin' | 'manager' | 'user' | 'internal'
}

interface PendingInvitation {
  id: string
  email: string
  full_name: string
  role: 'system_admin' | 'admin' | 'manager' | 'user' | 'internal'
  status: 'pending' | 'accepted' | 'expired'
  invited_by: string
  created_at: string
  expires_at: string
}

export function UserManagementInvitations() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [users, setUsers] = useState<InvitationUser[]>([
    { email: '', full_name: '', role: 'internal' }
  ])
  const [sending, setSending] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    const loadInvitations = async () => {
      setLoading(true)
      try {
        const result = await getPendingInvitations()
        if (result.success && result.data) {
          // Filter to only show invitations for internal users, managers, and admins
          const teamInvitations = result.data.filter((inv: UserInvitation) => 
            inv.role === 'admin' || 
            inv.role === 'manager' || 
            inv.role === 'internal'
          )
          
          // Check for expired invitations and update status if needed
          const now = new Date()
          const processedInvitations = teamInvitations.map((inv: UserInvitation) => {
            const expiresAt = new Date(inv.expires_at)
            const isExpired = expiresAt < now && inv.status === 'pending'
            
            return {
              ...inv,
              status: isExpired ? 'expired' : inv.status
            }
          })
          
          // Map database invitations to component format
          const mappedInvitations: PendingInvitation[] = processedInvitations.map((inv: UserInvitation) => ({
            id: inv.id,
            email: inv.email,
            full_name: inv.full_name,
            role: inv.role,
            status: inv.status,
            invited_by: inv.invited_by,
            created_at: new Date(inv.created_at).toLocaleDateString(),
            expires_at: new Date(inv.expires_at).toLocaleDateString(),
          }))
          
          setPendingInvitations(mappedInvitations)
        } else if (!result.success) {
          console.error('Failed to load invitations:', result.error)
          toastError('Failed to load invitations', {
            description: result.error || 'Please try again'
          })
        }
      } catch (error) {
        console.error('Error loading invitations:', error)
        toastError('Error loading invitations', {
          description: error instanceof Error ? error.message : 'Please try again'
        })
      } finally {
        setLoading(false)
      }
    }

    loadInvitations()
  }, [])

  const handleAddUser = () => {
    setUsers([...users, { email: '', full_name: '', role: 'internal' }])
  }

  const handleRemoveUser = (index: number) => {
    if (users.length > 1) {
      setUsers(users.filter((_, i) => i !== index))
    }
  }

  const handleUserChange = (index: number, field: keyof InvitationUser, value: string) => {
    const newUsers = [...users]
    newUsers[index] = { ...newUsers[index], [field]: value }
    setUsers(newUsers)
  }

  const validateUsers = () => {
    for (const user of users) {
      if (!user.email || !user.full_name) {
        return 'All users must have an email and full name'
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(user.email)) {
        return 'Please enter valid email addresses'
      }
    }
    return null
  }

  const handleSubmit = async () => {
    const validationError = validateUsers()
    if (validationError) {
      toastError(validationError)
      return
    }

    if (!session?.user?.id) {
      toastError('You must be logged in to send invitations')
      return
    }

    setSending(true)

    try {
      // Get settings to check if we should auto-assign default permissions
      const { getUserManagementSettings } = await import('@/lib/database-functions')
      const settingsResult = await getUserManagementSettings()
      const autoAssign = settingsResult.data?.auto_assign_default_permissions || false
      const defaultPerms = settingsResult.data?.default_permissions || {
        crm: false,
        invoicing: false,
        leadGeneration: false,
        analytics: false,
      }

      const invitations = users.map(user => {
        // Apply default permissions if auto-assign is enabled
        let tabPermissions: string[] = []
        if (autoAssign) {
          if (defaultPerms.crm) tabPermissions.push('crm')
          if (defaultPerms.invoicing) tabPermissions.push('invoicing')
          if (defaultPerms.leadGeneration) tabPermissions.push('lead-generation')
          if (defaultPerms.analytics) tabPermissions.push('analytics')
        }

        return {
          email: user.email,
          full_name: user.full_name,
          company_id: null, // null for internal/admin users (no space assignment)
          role: user.role,
          invited_by: session.user.id,
          tab_permissions: tabPermissions
        }
      })

      // Use the API route which handles email sending
      const response = await fetch('/api/invitations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitations,
          company_name: 'Parrot Portal', // Default company name for internal users
          inviter_name: session.user.name || 'Administrator'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toastError(result.error || 'Failed to send invitations')
        return
      }

      toastSuccess(`${invitations.length} invitation${invitations.length > 1 ? 's' : ''} sent successfully!`)
      
      // Reset form
      setUsers([{ email: '', full_name: '', role: 'internal' }])
      setIsInviteModalOpen(false)
      
      // Refresh pending invitations
      const refreshResult = await getPendingInvitations()
      if (refreshResult.success && refreshResult.data) {
        // Filter to only show invitations for internal users, managers, and admins
        const teamInvitations = refreshResult.data.filter((inv: UserInvitation) => 
          inv.role === 'admin' || 
          inv.role === 'manager' || 
          inv.role === 'internal'
        )
        
        const mappedInvitations: PendingInvitation[] = teamInvitations.map((inv: UserInvitation) => ({
          id: inv.id,
          email: inv.email,
          full_name: inv.full_name,
          role: inv.role,
          status: inv.status,
          invited_by: inv.invited_by,
          created_at: new Date(inv.created_at).toLocaleDateString(),
          expires_at: new Date(inv.expires_at).toLocaleDateString(),
        }))
        setPendingInvitations(mappedInvitations)
      }

    } catch (error) {
      toastError('Failed to send invitations', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setSending(false)
    }
  }

  // Filter invitations - show all pending and expired invitations (not accepted ones)
  const filteredInvitations = pendingInvitations.filter(inv => {
    const matchesSearch = 
      inv.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Show pending and expired invitations (not accepted ones)
    const isVisible = inv.status === 'pending' || inv.status === 'expired'
    
    return matchesSearch && isVisible
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Clock
      case 'accepted':
        return CheckCircle
      case 'expired':
        return XCircle
      default:
        return Mail
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setIsInviteModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Invite Users
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search invitations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations ({filteredInvitations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <div className="space-y-4">
            {filteredInvitations.map((invitation) => {
              const StatusIcon = getStatusIcon(invitation.status)
              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                      <Mail className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{invitation.full_name}</h3>
                        <Badge className={getStatusColor(invitation.status)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {invitation.status}
                        </Badge>
                        <Badge variant="outline">{invitation.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{invitation.email}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>Invited: {invitation.created_at}</span>
                        <span>Expires: {invitation.expires_at}</span>
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
                      <DropdownMenuItem onClick={() => {
                        // TODO: Implement resend invitation
                        toastError('Resend invitation functionality coming soon')
                      }}>
                        Resend Invitation
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={async () => {
                          try {
                            const result = await cancelInvitation(invitation.id)
                            if (result.success) {
                              toastSuccess('Invitation cancelled')
                              // Refresh invitations
                              const refreshResult = await getPendingInvitations()
                              if (refreshResult.success && refreshResult.data) {
                                // Filter to only show invitations for internal users, managers, and admins
                                const teamInvitations = refreshResult.data.filter((inv: UserInvitation) => 
                                  inv.role === 'admin' || 
                                  inv.role === 'manager' || 
                                  inv.role === 'internal'
                                )
                                
                                const mappedInvitations: PendingInvitation[] = teamInvitations.map((inv: UserInvitation) => ({
                                  id: inv.id,
                                  email: inv.email,
                                  full_name: inv.full_name,
                                  role: inv.role,
                                  status: inv.status,
                                  invited_by: inv.invited_by,
                                  created_at: new Date(inv.created_at).toLocaleDateString(),
                                  expires_at: new Date(inv.expires_at).toLocaleDateString(),
                                }))
                                setPendingInvitations(mappedInvitations)
                              }
                            } else {
                              toastError(result.error || 'Failed to cancel invitation')
                            }
                          } catch (error) {
                            toastError('Failed to cancel invitation')
                          }
                        }}
                      >
                        Cancel Invitation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite Internal Users</DialogTitle>
            <DialogDescription>
              Add new internal users to the platform. They will receive an email invitation to join.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-4">
              {users.map((user, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">User {index + 1}</h4>
                    {users.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(index)}
                        disabled={sending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`email-${index}`}>Email *</Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        value={user.email}
                        onChange={(e) => handleUserChange(index, 'email', e.target.value)}
                        placeholder="user@company.com"
                        disabled={sending}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`name-${index}`}>Full Name *</Label>
                      <Input
                        id={`name-${index}`}
                        type="text"
                        value={user.full_name}
                        onChange={(e) => handleUserChange(index, 'full_name', e.target.value)}
                        placeholder="John Doe"
                        disabled={sending}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`role-${index}`}>Role</Label>
                    <Select
                      value={user.role}
                      onValueChange={(value: 'admin' | 'manager' | 'user' | 'internal') => 
                        handleUserChange(index, 'role', value)
                      }
                      disabled={sending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddUser}
              disabled={sending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another User
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteModalOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={sending || users.some(u => !u.email || !u.full_name)}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Invitations...
                </>
              ) : (
                `Send ${users.length} Invitation${users.length > 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

