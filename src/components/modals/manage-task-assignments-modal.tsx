'use client'

import { useState, useEffect } from 'react'
import { X, User as UserIcon, UserPlus, UserMinus, AlertCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TaskWithDetails, User } from '@/lib/supabase'
import { getTaskAssignments, assignUsersToTask, removeUsersFromTask } from '@/lib/database-functions'

interface TaskAssignment {
  assignment_id: string
  user_id: string
  full_name: string
  email: string
  assigned_at: string
  assigned_by: string | null
}

interface ManageTaskAssignmentsModalProps {
  task: TaskWithDetails | null
  isOpen: boolean
  onClose: () => void
  onAssignmentsUpdated: () => void
  users: User[]
}

export function ManageTaskAssignmentsModal({ task, isOpen, onClose, onAssignmentsUpdated, users }: ManageTaskAssignmentsModalProps) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)
  const [error, setError] = useState('')

  // Load assignments when modal opens
  useEffect(() => {
    if (task && isOpen) {
      loadAssignments()
      setError('')
    }
  }, [task, isOpen])

  const loadAssignments = async () => {
    if (!task) return

    setIsLoadingAssignments(true)
    try {
      const result = await getTaskAssignments(task.id)
      if (result.success && result.data) {
        setAssignments(result.data)
      } else {
        console.error('Failed to load assignments:', result.error)
        setError(result.error || 'Failed to load assignments')
      }
    } catch (error) {
      console.error('Error loading assignments:', error)
      setError('An error occurred while loading assignments')
    } finally {
      setIsLoadingAssignments(false)
    }
  }

  const handleAddAssignment = async () => {
    if (!task || !selectedUser) return

    setIsLoading(true)
    setError('')

    try {
      const result = await assignUsersToTask(task.id, [selectedUser])
      if (result.success) {
        console.log('User assigned successfully')
        setSelectedUser('')
        await loadAssignments() // Reload assignments
        onAssignmentsUpdated() // Notify parent component
      } else {
        setError(result.error || 'Failed to assign user to task')
      }
    } catch (error) {
      console.error('Error assigning user:', error)
      setError('An error occurred while assigning user')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAssignment = async (userId: string) => {
    if (!task) return

    if (!confirm('Are you sure you want to remove this user from the task?')) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await removeUsersFromTask(task.id, [userId])
      if (result.success) {
        console.log('User removed successfully')
        await loadAssignments() // Reload assignments
        onAssignmentsUpdated() // Notify parent component
      } else {
        setError(result.error || 'Failed to remove user from task')
      }
    } catch (error) {
      console.error('Error removing user:', error)
      setError('An error occurred while removing user')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  if (!task) return null

  // Get available users (users not already assigned)
  const assignedUserIds = assignments.map(a => a.user_id)
  const availableUsers = users.filter(user => !assignedUserIds.includes(user.id))

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Task Assignments
          </DialogTitle>
          <DialogDescription>
            Assign or remove users from the task &quot;{task.title}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Assignments */}
          <div className="space-y-3">
            <Label>Current Assignments ({assignments.length})</Label>
            {isLoadingAssignments ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-600">Loading assignments...</span>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                                 <UserIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No users assigned to this task</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div key={assignment.assignment_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {assignment.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{assignment.full_name}</p>
                        <p className="text-xs text-gray-500">{assignment.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAssignment(assignment.user_id)}
                      disabled={isLoading}
                      className="text-red-500 hover:text-red-600"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Assignment */}
          {availableUsers.length > 0 && (
            <div className="space-y-3">
              <Label>Add User to Task</Label>
              <div className="flex gap-2">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a user to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          {user.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddAssignment}
                  disabled={!selectedUser || isLoading}
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 