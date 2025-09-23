"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { createProject, fetchUsers, fetchCompanies } from '@/lib/database-functions'
import { Button } from '@/components/ui/button'
import { TextField, TextAreaField, SelectField } from '@/components/ui/form-field'
import { Label } from '@/components/ui/label'
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
import { useFormValidation, formSchemas } from '@/lib/validation'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: () => void
}

export default function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form validation
  const {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateForm,
    reset,
    isValid
  } = useFormValidation(
    {
      name: '',
      description: '',
      managerId: 'none',
      companyId: ''
    },
    formSchemas.project
  )

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
        setValue('companyId', session.user.company_id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate form before submission
    if (!validateForm()) {
      return
    }
    
    if (!session?.user?.id) {
      setError('User session not found')
      return
    }

    setLoading(true)

    try {
      const projectData = {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        manager_id: values.managerId === 'none' ? null : values.managerId,
        company_id: values.companyId || session.user.company_id,
        status: 'active' as const,
        created_by: session.user.id
      }

      console.log('Creating project with data:', projectData)
      console.log('User ID:', session.user.id)
      const result = await createProject(projectData, session.user.id)
      console.log('Create project result:', result)
      
      if (result.success && result.data) {
        // Reset form
        reset()
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
      reset()
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
          <TextField
            label="Project Name"
            name="name"
            value={values.name}
            onChange={(value) => setValue('name', value)}
            onBlur={() => setFieldTouched('name')}
            error={errors.name}
            touched={touched.name}
            placeholder="Enter project name"
            required
            disabled={loading}
          />

          <TextAreaField
            label="Description"
            name="description"
            value={values.description}
            onChange={(value) => setValue('description', value)}
            onBlur={() => setFieldTouched('description')}
            error={errors.description}
            touched={touched.description}
            placeholder="Describe the project goals and objectives"
            rows={3}
            disabled={loading}
          />

          <SelectField
            label="Project Manager"
            name="managerId"
            value={values.managerId}
            onChange={(value) => setValue('managerId', value)}
            onBlur={() => setFieldTouched('managerId')}
            error={errors.managerId}
            touched={touched.managerId}
            placeholder="Select a manager (optional)"
            disabled={loading}
            options={[
              { value: 'none', label: 'No manager assigned' },
              ...users
                .filter(user => user.role === 'manager' || user.role === 'admin')
                .map(user => ({
                  value: user.id,
                  label: `${user.full_name} (${user.role})`
                }))
            ]}
          />

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
            <SelectField
              label="Company"
              name="companyId"
              value={values.companyId}
              onChange={(value) => setValue('companyId', value)}
              onBlur={() => setFieldTouched('companyId')}
              error={errors.companyId}
              touched={touched.companyId}
              placeholder="Select a company"
              required
              disabled={loading}
              options={companies.map(company => ({
                value: company.id,
                label: company.name
              }))}
            />
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
            <Button type="submit" disabled={loading || !isValid}>
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