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
  MoreVertical,
  X
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
import { Separator } from '@/components/ui/separator'
import EmptyState from '@/components/ui/empty-state'
import { format } from 'date-fns'
import { toastSuccess, toastError } from '@/lib/toast'
import { Form, FormField, FormSubmission } from '@/lib/supabase'
import { 
  fetchForms, 
  createForm, 
  updateForm, 
  deleteForm,
  submitForm,
  fetchFormSubmissions,
  fetchFormsForSpace,
  assignFormToSpace,
  unassignFormFromSpace,
  hasUserSubmittedForm
} from '@/lib/database-functions'
import AdvancedFormBuilder from '@/components/modals/advanced-form-builder'
import ViewSubmissionsModal from '@/components/modals/view-submissions-modal'
import FillFormModal from '@/components/modals/fill-form-modal'
import ConversationalFormModal from '@/components/modals/conversational-form-modal'

interface FormsTabProps {
  currentSpaceId?: string | null
}

export default function FormsTab({ currentSpaceId }: FormsTabProps) {
  const { data: session } = useSession()
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [allForms, setAllForms] = useState<Form[]>([]) // Store all forms for admin/manager view
  const [assignedFormIds, setAssignedFormIds] = useState<Set<string>>(new Set())
  const [submittedOnboardingFormId, setSubmittedOnboardingFormId] = useState<string | null>(null)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false)
  const [showFillModal, setShowFillModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)

  const isAdmin = session?.user?.role === 'admin'
  const isManager = session?.user?.role === 'manager'
  const canManageForms = isAdmin || isManager

  // Load forms on component mount and when space changes
  useEffect(() => {
    loadForms()
  }, [currentSpaceId])

  // Listen for onboarding form fill event from space overview
  useEffect(() => {
    const handleFillOnboardingFormEvent = (event: CustomEvent) => {
      const formId = event.detail?.formId
      if (formId) {
        const form = forms.find(f => f.id === formId)
        if (form) {
          setSelectedForm(form)
          setShowFillModal(true)
        }
      }
    }

    window.addEventListener('fillOnboardingForm', handleFillOnboardingFormEvent as EventListener)
    return () => {
      window.removeEventListener('fillOnboardingForm', handleFillOnboardingFormEvent as EventListener)
    }
  }, [forms])

  const loadForms = async () => {
    setLoading(true)
    try {
      const formsData = await fetchForms()
      setAllForms(formsData)
      
      // If in a space, load assigned forms for that space
      if (currentSpaceId && session?.user?.id) {
        const assigned = await fetchFormsForSpace(currentSpaceId)
        setAssignedFormIds(new Set(assigned.map(f => f.id)))
        
        // Check if onboarding form has been submitted
        const onboardingForm = assigned.find(f => 
          f.title.toLowerCase() === 'onboarding' || 
          f.title.toLowerCase().includes('onboarding')
        )
        
        if (onboardingForm) {
          const submitted = await hasUserSubmittedForm(session.user.id, onboardingForm.id, currentSpaceId)
          if (submitted) {
            setSubmittedOnboardingFormId(onboardingForm.id)
          } else {
            setSubmittedOnboardingFormId(null)
          }
        } else {
          setSubmittedOnboardingFormId(null)
        }
        
        // Show all forms to managers/admins (so they can assign/remove), only assigned to regular users
        // Filter out submitted onboarding form for regular users
        if (canManageForms) {
          setForms(formsData) // Show all forms for managers/admins
        } else {
          const filteredForms = formsData.filter(f => {
            const isAssigned = assigned.some(af => af.id === f.id)
            // Hide onboarding form if it's been submitted
            if (f.id === submittedOnboardingFormId) {
              return false
            }
            return isAssigned
          })
          setForms(filteredForms)
        }
      } else {
        // Admin view (no space) - show all forms
        setForms(formsData)
        setAssignedFormIds(new Set())
        setSubmittedOnboardingFormId(null)
      }
    } catch (error) {
      console.error('Error loading forms:', error)
      toastError('Failed to load forms', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFormCreated = async () => {
    await loadForms()
    toastSuccess('Form created successfully')
  }

  const handleFormUpdated = async () => {
    await loadForms()
    toastSuccess('Form updated successfully')
  }

  const handleFormDeleted = async () => {
    await loadForms()
    toastSuccess('Form deleted successfully')
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
          toastError(result.error || 'Failed to delete form')
        }
      } catch (error) {
        console.error('Error deleting form:', error)
        toastError('An error occurred while deleting the form', {
          description: error instanceof Error ? error.message : 'Please try again'
        })
      }
    }
  }

  const handleFillForm = (form: Form) => {
    console.log('handleFillForm called with form:', form.title)
    setSelectedForm(form)
    setShowFillModal(true)
    console.log('Modal state set - selectedForm:', form.id, 'showFillModal: true')
  }

  const handleFormSubmitted = async () => {
    toastSuccess('Form submitted successfully')
    // Reload forms to update the list (this will hide onboarding form if it was submitted)
    await loadForms()
    // Notify space overview to refresh onboarding card status
    window.dispatchEvent(new CustomEvent('formSubmitted'))
  }

  const handleToggleFormAssignment = async (form: Form) => {
    if (!currentSpaceId) return

    const isAssigned = assignedFormIds.has(form.id)
    
    try {
      if (isAssigned) {
        const result = await unassignFormFromSpace(form.id, currentSpaceId)
        if (result.success) {
          setAssignedFormIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(form.id)
            return newSet
          })
          // Reload forms to update the display
          await loadForms()
          toastSuccess('Form unassigned from space')
        } else {
          toastError(result.error || 'Failed to unassign form')
        }
      } else {
        const result = await assignFormToSpace(form.id, currentSpaceId)
        if (result.success) {
          setAssignedFormIds(prev => new Set(prev).add(form.id))
          // Reload forms to update the display
          await loadForms()
          toastSuccess('Form assigned to space')
        } else {
          toastError(result.error || 'Failed to assign form')
        }
      }
    } catch (error) {
      console.error('Error toggling form assignment:', error)
      toastError('An error occurred', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    }
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

  // Parse settings from form description
  const parseFormSettings = (description?: string): { saveAsDocument: boolean } => {
    if (!description) {
      return { saveAsDocument: true } // Default enabled
    }
    try {
      const settingsMatch = description.match(/__SETTINGS__({[\s\S]*?})__SETTINGS__/)
      if (settingsMatch) {
        const parsed = JSON.parse(settingsMatch[1])
        return {
          saveAsDocument: parsed.saveAsDocument !== false // Default to true if not specified
        }
      }
    } catch (e) {
      console.error('Error parsing form settings:', e)
    }
    return { saveAsDocument: true } // Default enabled
  }

  // Clean description by removing theme and settings JSON
  const cleanFormDescription = (description?: string): string => {
    if (!description) return 'No description available'
    let clean = description
      .replace(/__THEME__{[\s\S]*?}__THEME__/g, '')
      .replace(/__SETTINGS__{[\s\S]*?}__SETTINGS__/g, '')
      .trim()
    return clean || 'No description available'
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
    <div className="space-y-6 relative">
      {/* Show form builder full-page when creating or editing */}
      {showCreateModal && (
        <AdvancedFormBuilder
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          onFormCreated={handleFormCreated}
        />
      )}

      {showEditModal && selectedForm && (
        <AdvancedFormBuilder
          isOpen={true}
          onClose={() => {
            setShowEditModal(false)
            setSelectedForm(null)
          }}
          onFormCreated={handleFormUpdated}
          form={selectedForm}
        />
      )}

      {/* Forms list - hidden when builder is open */}
      {(showCreateModal || (showEditModal && selectedForm)) ? null : (
        <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Forms</h2>
          <p className="text-gray-600">
            {currentSpaceId 
              ? (canManageForms 
                  ? 'Assign or remove forms from this space' 
                  : 'Fill out forms from your company')
              : (isAdmin 
                  ? 'Create and manage forms for your clients' 
                  : 'Fill out forms from your company')
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && !currentSpaceId && (
            <Button variant="orange" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          )}
        </div>
      </div>

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
        (() => {
          // Determine the appropriate empty state based on context
          const isInSpace = currentSpaceId !== null && currentSpaceId !== undefined
          const hasFormsInSystem = allForms.length > 0
          const hasAssignedForms = assignedFormIds.size > 0
          
          // Case 1: Regular user in a space - no forms assigned to this space
          if (isInSpace && !canManageForms) {
            if (hasFormsInSystem && !hasAssignedForms) {
              // Forms exist but none assigned to this space
              return (
                <EmptyState
                  icon={FileText}
                  title="No forms available for this space"
                  description="There are no forms currently assigned to this space. Contact your manager or administrator to request forms."
                />
              )
            } else {
              // No forms in system at all
              return (
                <EmptyState
                  icon={FileText}
                  title="No forms available"
                  description="Check back later for forms from your company"
                />
              )
            }
          }
          
          // Case 2: Manager/Admin in a space - show all forms (they can assign/remove)
          if (isInSpace && canManageForms) {
            if (!hasFormsInSystem) {
              // No forms in system at all
              return (
                <EmptyState
                  icon={FileText}
                  title="No forms available"
                  description="There are no forms in the system. Forms must be created in the admin view before they can be assigned to spaces."
                />
              )
            }
            // If we have forms but none assigned, they'll still see them in the list with "Assign" buttons
          }
          
          // Case 3: Admin view (no space) - no forms created yet
          if (!isInSpace && isAdmin) {
            return (
              <EmptyState
                icon={FileText}
                title="No forms created yet"
                description="Create your first form to start collecting information from clients"
                actionLabel="Create Form"
                onAction={() => setShowCreateModal(true)}
              />
            )
          }
          
          // Case 4: Regular user, no space, no forms
          if (!isInSpace && !isAdmin) {
            return (
              <EmptyState
                icon={FileText}
                title="No forms available"
                description="Check back later for forms from your company"
              />
            )
          }
          
          // Default case: No forms available
          return (
            <EmptyState
              icon={FileText}
              title="No forms available"
              description="Check back later for forms from your company"
            />
          )
        })()
      ) : (
        <div className={currentSpaceId && canManageForms 
          ? "space-y-2" 
          : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"}>
          {filteredForms.map((form) => {
            // Simplified view for managers/admins in a space
            if (currentSpaceId && canManageForms) {
              return (
                <Card key={form.id} className="parrot-card-enhanced hover:shadow-md transition-shadow">
                  <CardContent className="px-4 py-2">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold mb-1.5">{form.title}</CardTitle>
                        <CardDescription className="text-sm line-clamp-2 text-muted-foreground">
                          {cleanFormDescription(form.description)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {assignedFormIds.has(form.id) && (
                          <Button
                            size="sm"
                            variant="orange"
                            onClick={() => handleFillForm(form)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Fill Form
                          </Button>
                        )}
                        {assignedFormIds.has(form.id) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleFormAssignment(form)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleToggleFormAssignment(form)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        )}
                      </div>
                    </div>
                    {parseFormSettings(form.description).saveAsDocument && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        <span>Save to docs</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            }

            // Full view for other contexts
            return (
              <Card 
                key={form.id}
                className="parrot-card-enhanced hover:shadow-md transition-shadow flex flex-col h-full"
              >
                <CardHeader className="pb-2 px-4 pt-2">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold mb-1.5">{form.title}</CardTitle>
                      <CardDescription className="text-sm line-clamp-2 text-muted-foreground">
                        {cleanFormDescription(form.description)}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(form.is_active)}>
                      {form.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {parseFormSettings(form.description).saveAsDocument && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      <span>Save to docs</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col px-4 pb-2">
                  <div className="flex-1"></div>
                  {/* Form Actions - Always at bottom */}
                  <div className="flex flex-col gap-2 mt-auto pt-2 border-t">
                    <div className="flex items-center justify-end gap-2">
                        {currentSpaceId && assignedFormIds.has(form.id) ? (
                          // Any user in a space - show fill form button if assigned
                          <Button
                            size="sm"
                            variant="orange"
                            onClick={() => handleFillForm(form)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Fill Form
                          </Button>
                        ) : isAdmin && !currentSpaceId ? (
                          // Admin view (no space) - show full management options
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
                        ) : null}
                      </div>
                    <div className="text-xs text-muted-foreground">
                      Created {format(new Date(form.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
        </>
      )}


      {/* Modals */}
      {selectedForm && (
        <>
          <ViewSubmissionsModal
            isOpen={showSubmissionsModal}
            onClose={() => setShowSubmissionsModal(false)}
            form={selectedForm}
          />

          {(() => {
            // Parse theme from form description
            let formTheme = {
              primaryColor: '#f97316',
              backgroundColor: '#ffffff',
              textColor: '#000000',
              fontFamily: 'inherit',
              conversational: false
            }
            
            if (selectedForm.description) {
              try {
                // Use a more robust regex that handles multiline JSON
                const themeMatch = selectedForm.description.match(/__THEME__({[\s\S]*?})__THEME__/)
                if (themeMatch) {
                  formTheme = JSON.parse(themeMatch[1])
                  console.log('Parsed theme in forms-tab:', formTheme)
                }
              } catch (e) {
                console.error('Error parsing theme in forms-tab:', e)
                // Ignore parse errors, use defaults
              }
            }

            return formTheme.conversational ? (
              <ConversationalFormModal
                isOpen={showFillModal}
                onClose={() => setShowFillModal(false)}
                onFormSubmitted={handleFormSubmitted}
                form={selectedForm}
                spaceId={currentSpaceId}
                theme={formTheme}
              />
            ) : (
              <FillFormModal
                isOpen={showFillModal}
                onClose={() => setShowFillModal(false)}
                onFormSubmitted={handleFormSubmitted}
                form={selectedForm}
                spaceId={currentSpaceId}
                theme={formTheme}
              />
            )
          })()}
        </>
      )}
    </div>
  )
} 