"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileText, 
  Users, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Mail,
  Hash,
  List,
  CheckSquare,
  MoreVertical
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import EmptyState from '@/components/ui/empty-state'
import { format } from 'date-fns'
import { Form, FormField, FormSubmission } from '@/lib/supabase'
import { 
  fetchForms, 
  createForm, 
  updateForm, 
  deleteForm,
  submitForm,
  fetchFormSubmissions
} from '@/lib/database-functions'
import CreateFormModal from '@/components/modals/create-form-modal'
import EditFormModal from '@/components/modals/edit-form-modal'
import ViewSubmissionsModal from '@/components/modals/view-submissions-modal'
import FillFormModal from '@/components/modals/fill-form-modal'

export default function FormsTab() {
  const { data: session } = useSession()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false)
  const [showFillModal, setShowFillModal] = useState(false)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)

  const isAdmin = session?.user?.role === 'admin'

  // Load forms on component mount
  useEffect(() => {
    loadForms()
  }, [])

  const loadForms = async () => {
    setLoading(true)
    try {
      const formsData = await fetchForms()
      setForms(formsData)
    } catch (error) {
      console.error('Error loading forms:', error)
      setError('Failed to load forms')
    } finally {
      setLoading(false)
    }
  }

  const handleFormCreated = async () => {
    await loadForms()
    setSuccess('Form created successfully')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleFormUpdated = async () => {
    await loadForms()
    setSuccess('Form updated successfully')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleFormDeleted = async () => {
    await loadForms()
    setSuccess('Form deleted successfully')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleViewSubmissions = (form: Form) => {
    setSelectedForm(form)
    setShowSubmissionsModal(true)
  }

  const handleEditForm = (form: Form) => {
    setSelectedForm(form)
    setShowEditModal(true)
  }

  const handleDeleteForm = async (form: Form) => {
    if (confirm(`Are you sure you want to delete "${form.title}"? This action cannot be undone.`)) {
      try {
        const result = await deleteForm(form.id)
        if (result.success) {
          await handleFormDeleted()
        } else {
          setError(result.error || 'Failed to delete form')
        }
      } catch (error) {
        console.error('Error deleting form:', error)
        setError('An error occurred while deleting the form')
      }
    }
  }

  const handleFillForm = (form: Form) => {
    setSelectedForm(form)
    setShowFillModal(true)
  }

  const handleFormSubmitted = async () => {
    setSuccess('Form submitted successfully')
    setTimeout(() => setSuccess(''), 3000)
  }

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && form.is_active) ||
                         (statusFilter === 'inactive' && !form.is_active)
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const getFieldTypeIcon = (type: FormField['type']) => {
    switch (type) {
      case 'text':
      case 'textarea':
        return <FileText className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'number':
        return <Hash className="h-4 w-4" />
      case 'select':
      case 'radio':
        return <List className="h-4 w-4" />
      case 'checkbox':
        return <CheckSquare className="h-4 w-4" />
      case 'date':
        return <Calendar className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading forms...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Forms</h2>
          <p className="text-gray-600">
            {isAdmin ? 'Create and manage forms for your clients' : 'Fill out forms from your company'}
          </p>
        </div>
        {isAdmin && (
          <Button variant="orange" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Form
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {isAdmin && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={isAdmin ? 'No forms created yet' : 'No forms available'}
          description={isAdmin 
            ? 'Create your first form to start collecting information from clients'
            : 'Check back later for forms from your company'
          }
          actionLabel={isAdmin ? 'Create Form' : undefined}
          onAction={isAdmin ? () => {/* Add create form logic */} : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form) => (
            <Card key={form.id} className="parrot-card-enhanced hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{form.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {form.description || 'No description available'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(form.is_active)}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Form Fields Preview */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Fields:</p>
                    <div className="flex flex-wrap gap-1">
                      {form.fields.slice(0, 3).map((field, index) => (
                        <Badge key={field.id} variant="outline" className="text-xs">
                          {field.label}
                        </Badge>
                      ))}
                      {form.fields.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{form.fields.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Form Actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Created {format(new Date(form.created_at), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSubmissions(form)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Submissions
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditForm(form)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Form
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteForm(form)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Form
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="orange"
                          onClick={() => handleFillForm(form)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Fill Form
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onFormCreated={handleFormCreated}
      />

      {selectedForm && (
        <>
          <EditFormModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onFormUpdated={handleFormUpdated}
            form={selectedForm}
          />

          <ViewSubmissionsModal
            isOpen={showSubmissionsModal}
            onClose={() => setShowSubmissionsModal(false)}
            form={selectedForm}
          />

          <FillFormModal
            isOpen={showFillModal}
            onClose={() => setShowFillModal(false)}
            onFormSubmitted={handleFormSubmitted}
            form={selectedForm}
          />
        </>
      )}
    </div>
  )
} 