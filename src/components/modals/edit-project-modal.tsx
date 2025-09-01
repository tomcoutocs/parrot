"use client"

import { useState, useEffect } from 'react'
import { AlertCircle, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Project, ProjectWithDetails, User, Company } from '@/lib/supabase'
import { useSession } from '@/components/providers/session-provider'
import { fetchUsers, fetchCompanies, updateProject } from '@/lib/database-functions'

interface EditProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectUpdated: () => void
  project: ProjectWithDetails | null
  users: Array<{ id: string; full_name: string; email: string; role: string }>
}

export default function EditProjectModal({ 
  isOpen, 
  onClose, 
  onProjectUpdated, 
  project,
  users 
}: EditProjectModalProps) {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Project['status']>('active')
  const [managerId, setManagerId] = useState<string>('none')
  const [companyId, setCompanyId] = useState<string>('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Load companies when modal opens
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const companiesData = await fetchCompanies()
        setCompanies(companiesData)
      } catch (error) {
        console.error('Error loading companies:', error)
      }
    }
    
    if (isOpen) {
      loadCompanies()
    }
  }, [isOpen])

  // Initialize form with project data when modal opens
  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
      setStatus(project.status)
      setManagerId(project.manager_id || 'none')
      setCompanyId(project.company_id || '')
    }
  }, [project])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!name.trim()) {
      setError('Project name is required')
      setIsLoading(false)
      return
    }

    if (!companyId) {
      setError('Company selection is required')
      setIsLoading(false)
      return
    }

    if (!session?.user?.id) {
      setError('User session not found')
      setIsLoading(false)
      return
    }

    if (!project) {
      setError('No project selected')
      setIsLoading(false)
      return
    }

    try {
      const updateData = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        manager_id: managerId === 'none' ? undefined : managerId || undefined,
        company_id: companyId
      }

      const result = await updateProject(project.id, updateData)

      if (result.success) {
        onProjectUpdated()
        onClose()
      } else {
        setError(result.error || 'Failed to update project')
      }
    } catch (error) {
      console.error('Error updating project:', error)
      setError('An error occurred while updating the project.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setError('')
      onClose()
    }
  }

  if (!project) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Edit Project: {project.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          {/* Status and Manager */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: Project['status']) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager">Project Manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {users
                    .filter(user => user.role === 'manager' || user.role === 'admin')
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {user.full_name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {session?.user?.role === 'admin' ? (
                  // Admins can select any company
                  companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))
                ) : (
                  // Non-admins can only select their own company
                  companies
                    .filter(company => company.id === session?.user?.company_id)
                    .map(company => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Project Info */}
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Created:</strong> {new Date(project.created_at).toLocaleDateString()}</p>
              <p><strong>Tasks:</strong> {project.task_count || 0} tasks</p>
              {project.created_user && (
                <p><strong>Created by:</strong> {project.created_user.full_name}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !name.trim() || !companyId}
            >
              {isLoading ? 'Updating...' : 'Update Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 