'use client'

import { useState, useEffect } from 'react'
import { X, Users, UserPlus, UserMinus, Crown, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { ProjectWithDetails, User, ProjectManager, ProjectMember } from '@/lib/supabase'
import { addProjectManager, removeProjectManager, addProjectMember, removeProjectMember, fetchUsers, checkMultipleUsersTables } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'

interface ManageProjectUsersModalProps {
  project: ProjectWithDetails | null
  isOpen: boolean
  onClose: () => void
  onProjectUpdated: () => void
}

export function ManageProjectUsersModal({ project, isOpen, onClose, onProjectUpdated }: ManageProjectUsersModalProps) {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [selectedManager, setSelectedManager] = useState<string>('')
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [managerRole, setManagerRole] = useState<string>('manager')
  const [memberRole, setMemberRole] = useState<string>('member')
  const [isLoading, setIsLoading] = useState(false)
  const [tablesExist, setTablesExist] = useState<{ projectManagers: boolean; projectMembers: boolean }>({ projectManagers: false, projectMembers: false })

  useEffect(() => {
    if (isOpen) {
      loadUsers()
      checkTables()
    }
  }, [isOpen])

  const checkTables = async () => {
    const tables = await checkMultipleUsersTables()
    setTablesExist(tables)
  }

  const loadUsers = async () => {
    const fetchedUsers = await fetchUsers()
    setUsers(fetchedUsers)
  }

  const handleAddManager = async () => {
    if (!project || !selectedManager) return

    setIsLoading(true)
    try {
      const result = await addProjectManager(project.id, selectedManager, managerRole, session?.user?.id)
      if (result.success) {
        console.log('Manager added successfully')
        setSelectedManager('')
        onProjectUpdated()
      } else {
        console.error(result.error || 'Failed to add manager')
      }
    } catch (error) {
      console.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveManager = async (userId: string) => {
    if (!project) return

    setIsLoading(true)
    try {
      const result = await removeProjectManager(project.id, userId, session?.user?.id)
      if (result.success) {
        console.log('Manager removed successfully')
        onProjectUpdated()
      } else {
        console.error(result.error || 'Failed to remove manager')
      }
    } catch (error) {
      console.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!project || !selectedMember) return

    setIsLoading(true)
    try {
      const result = await addProjectMember(project.id, selectedMember, memberRole, session?.user?.id)
      if (result.success) {
        console.log('Member added successfully')
        setSelectedMember('')
        onProjectUpdated()
      } else {
        console.error(result.error || 'Failed to add member')
      }
    } catch (error) {
      console.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!project) return

    setIsLoading(true)
    try {
      const result = await removeProjectMember(project.id, userId, session?.user?.id)
      if (result.success) {
        console.log('Member removed successfully')
        onProjectUpdated()
      } else {
        console.error(result.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getAvailableUsers = (type: 'manager' | 'member') => {
    if (!project) return users

    const existingUserIds = type === 'manager' 
      ? project.managers?.map(m => m.id) || []
      : project.members?.map(m => m.id) || []

    return users.filter(user => !existingUserIds.includes(user.id))
  }

  if (!isOpen || !project) return null

  const availableManagers = getAvailableUsers('manager')
  const availableMembers = getAvailableUsers('member')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Manage Project Users</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">{project.name}</h3>
            <p className="text-sm text-gray-600">{project.description}</p>
          </div>

          {(!tablesExist.projectManagers || !tablesExist.projectMembers) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Database Setup Required:</strong> The multiple users feature requires database tables to be created. 
                Please run the database migration script to enable this feature.
              </p>
            </div>
          )}

          {/* Project Managers Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Project Managers ({project.managers?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Managers */}
              <div className="space-y-2">
                {project.managers?.map((manager) => (
                  <div key={manager.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                         <div className="flex items-center gap-2">
                       <UserIcon className="h-4 w-4" />
                       <span className="font-medium">{manager.user.full_name}</span>
                       <Badge variant="secondary">{manager.role}</Badge>
                     </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveManager(manager.id)}
                      disabled={isLoading}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!project.managers || project.managers.length === 0) && (
                  <p className="text-sm text-gray-500 italic">No managers assigned</p>
                )}
              </div>

              {/* Add Manager */}
              {availableManagers.length > 0 && (
                <div className="flex gap-2">
                  <Select value={selectedManager} onValueChange={setSelectedManager}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a user to add as manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableManagers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={managerRole} onValueChange={setManagerRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="coordinator">Coordinator</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddManager} disabled={!selectedManager || isLoading}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Project Members Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Project Members ({project.members?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Members */}
              <div className="space-y-2">
                {project.members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                         <div className="flex items-center gap-2">
                       <UserIcon className="h-4 w-4" />
                       <span className="font-medium">{member.user.full_name}</span>
                       <Badge variant="outline">{member.role}</Badge>
                     </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={isLoading}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!project.members || project.members.length === 0) && (
                  <p className="text-sm text-gray-500 italic">No members assigned</p>
                )}
              </div>

              {/* Add Member */}
              {availableMembers.length > 0 && (
                <div className="flex gap-2">
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a user to add as member" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMembers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={memberRole} onValueChange={setMemberRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="contributor">Contributor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddMember} disabled={!selectedMember || isLoading}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
} 