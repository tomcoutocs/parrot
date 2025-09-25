'use client'

import { useState } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle, Plus, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface UserInvitationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: Array<{ id: string; name: string }>
  selectedCompanyId?: string
}

interface InvitationUser {
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'user' | 'internal'
}

export default function UserInvitationModal({ open, onOpenChange, companies, selectedCompanyId }: UserInvitationModalProps) {
  const { data: session } = useSession()
  const [users, setUsers] = useState<InvitationUser[]>([
    { email: '', full_name: '', role: 'user' }
  ])
  const [selectedCompany, setSelectedCompany] = useState<string>(selectedCompanyId || companies[0]?.id || '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const defaultTabPermissions = [
    'calendar',
    'documents', 
    'forms',
    'projects',
    'services'
  ]

  const handleAddUser = () => {
    setUsers([...users, { email: '', full_name: '', role: 'user' }])
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
    if (!selectedCompany) {
      return 'Please select a company'
    }
    
    for (const user of users) {
      if (!user.email || !user.full_name) {
        return 'All users must have an email and full name'
      }
      
      // Basic email validation
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
      setError(validationError)
      return
    }

    if (!session?.user?.id) {
      setError('You must be logged in to send invitations')
      return
    }

    setSending(true)
    setError('')
    setSuccess('')

    try {
      const invitations = users.map(user => ({
        email: user.email,
        full_name: user.full_name,
        company_id: selectedCompany,
        role: user.role,
        invited_by: session.user.id,
        tab_permissions: defaultTabPermissions
      }))

      console.log('🚀 Sending invitation request:', {
        invitationCount: invitations.length,
        selectedCompany: selectedCompany,
        companyName: companies.find(c => c.id === selectedCompany)?.name || 'Company',
        inviterName: session.user.name || 'Administrator'
      })

      const response = await fetch('/api/invitations/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          invitations,
          company_name: companies.find(c => c.id === selectedCompany)?.name || 'Company',
          inviter_name: session.user.name || 'Administrator'
        })
      })

      console.log('📡 API response status:', response.status)

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send invitations')
        return
      }

      setSuccess(`${invitations.length} invitations sent successfully!`)
      
      // Reset form
      setUsers([{ email: '', full_name: '', role: 'user' }])
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onOpenChange(false)
        setSuccess('')
      }, 2000)

    } catch (error) {
      setError('Failed to send invitations')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (!sending) {
      setUsers([{ email: '', full_name: '', role: 'user' }])
      setError('')
      setSuccess('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Users</DialogTitle>
          <DialogDescription>
            Add users to a company. They will receive an email invitation to join the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Company Selection */}
          <div className="space-y-2">
            <Label htmlFor="company-select">Select Company *</Label>
            <Select
              value={selectedCompany}
              onValueChange={setSelectedCompany}
              disabled={sending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                      placeholder="user@example.com"
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
                      <SelectItem value="user">Client User</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="internal">Internal User</SelectItem>
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

          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Default Access</h4>
            <p className="text-sm text-blue-800">
              New users will have access to: Calendar, Documents, Forms, Projects, and Services tabs.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={sending || users.some(u => !u.email || !u.full_name) || !selectedCompany}
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
  )
}
