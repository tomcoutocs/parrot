"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { createProject, fetchUsers, fetchCompanies } from '@/lib/database-functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, X } from 'lucide-react'
import type { User, Company } from '@/lib/supabase'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: () => void
}

export default function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [managerId, setManagerId] = useState('none')
  const [companyId, setCompanyId] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Modal isOpen changed to true, loading data...')
      loadData()
    }
  }, [isOpen])

  // Load users and companies when modal opens
  const loadData = async () => {
    try {
      console.log('Loading data for create project modal...')
      const [usersData, companiesData] = await Promise.all([
        fetchUsers(),
        fetchCompanies()
      ])
      console.log('Users loaded:', usersData.length)
      console.log('Companies loaded:', companiesData.length, companiesData)
      console.log('Session user role:', session?.user?.role)
      console.log('Session user company_id:', session?.user?.company_id)
      setUsers(usersData)
      setCompanies(companiesData)
      
      // Set default company for non-admin users
      if (session?.user?.role !== 'admin' && session?.user?.company_id) {
        console.log('Setting default company for non-admin user:', session.user.company_id)
        setCompanyId(session.user.company_id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    if (!companyId) {
      setError('Company selection is required')
      return
    }

    if (!session?.user?.id) {
      setError('You must be logged in to create a project')
      return
    }

    setLoading(true)
    setError('')

    try {
      const projectData = {
        name: name.trim(),
        description: description.trim() || undefined,
        manager_id: managerId === 'none' ? null : managerId,
        company_id: companyId || session.user.company_id,
        status: 'active' as const,
        created_by: session.user.id
      }

      console.log('Creating project with data:', projectData)
      const result = await createProject(projectData, session.user.id)
      console.log('Create project result:', result)
      
      if (result.success && result.data) {
        // Reset form
        setName('')
        setDescription('')
        setManagerId('none')
        setError('')
        
        // Close modal and refresh projects
        onProjectCreated()
        onClose()
      } else {
        setError(result.error || 'Failed to create project. Please try again.')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      setError('An error occurred while creating the project')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    console.log('handleOpenChange called with open:', open)
    if (open) {
      console.log('Modal opening, calling loadData...')
      loadData()
    } else {
      // Reset form when closing
      setName('')
      setDescription('')
      setManagerId('none')
      setCompanyId('')
      setError('')
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize tasks and collaborate with your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project goals and objectives"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager">Project Manager</Label>
            <Select value={managerId} onValueChange={setManagerId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a manager (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager assigned</SelectItem>
                {users
                  .filter(user => user.role === 'manager' || user.role === 'admin')
                  .map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company * ({companies.length} available)</Label>
            {companies.length === 0 && (
              <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                No companies loaded. Check console for errors.
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  className="ml-2"
                  onClick={async () => {
                    console.log('Testing fetchCompanies...')
                    const testCompanies = await fetchCompanies()
                    console.log('Test result:', testCompanies)
                  }}
                >
                  Test Load Companies
                </Button>
              </div>
            )}
            <Select value={companyId} onValueChange={setCompanyId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {/* Temporarily show all companies for debugging */}
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || !companyId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 