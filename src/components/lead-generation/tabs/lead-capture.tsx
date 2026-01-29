"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Code, Link2, QrCode, FileText, Trash2, Edit, Eye } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeadFormBuilder } from '../components/lead-form-builder'
import { EmbedCode } from '../components/embed-code'
import { FormTemplates, type FormTemplate } from '../components/form-templates'
import { fetchLeadForms, createLeadForm, deleteLeadForm, type LeadForm } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { Badge } from '@/components/ui/badge'
import { toastSuccess, toastError } from '@/lib/toast'
import { FormPreviewModal } from '@/components/modals/form-preview-modal'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'

export function LeadCapture() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('forms')
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const [forms, setForms] = useState<LeadForm[]>([])
  const [loading, setLoading] = useState(true)
  const [showFormBuilder, setShowFormBuilder] = useState(false)
  const [editingForm, setEditingForm] = useState<LeadForm | null>(null)
  const [previewForm, setPreviewForm] = useState<LeadForm | null>(null)
  const [deleteForm, setDeleteForm] = useState<LeadForm | null>(null)
  const [deleting, setDeleting] = useState(false)

  const userId = session?.user?.id
  const companyId = session?.user?.company_id

  useEffect(() => {
    const loadForms = async () => {
      if (!userId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const result = await fetchLeadForms(companyId)

        if (result.success && result.forms) {
          setForms(result.forms)
        }
      } catch (error) {
        console.error('Error loading forms:', error)
      } finally {
        setLoading(false)
      }
    }

    loadForms()
  }, [userId, companyId])

  const handleFormCreated = () => {
    const loadForms = async () => {
      if (!session?.user?.id) return

      const result = await fetchLeadForms(session.user.company_id)
      if (result.success && result.forms) {
        setForms(result.forms)
      }
      setShowFormBuilder(false)
      setEditingForm(null)
    }

    loadForms()
  }

  const handleEditForm = async (form: LeadForm) => {
    setEditingForm(form)
    setShowFormBuilder(true)
    setActiveTab('forms')
  }

  const handleGetCode = (formId: string) => {
    setActiveForm(formId)
    setActiveTab('embed')
  }

  const handlePreviewForm = (form: LeadForm) => {
    setPreviewForm(form)
  }

  const handleDeleteForm = async () => {
    if (!deleteForm) return

    setDeleting(true)
    try {
      const result = await deleteLeadForm(deleteForm.id)
      if (result.success) {
        toastSuccess(`Form "${deleteForm.name}" deleted successfully`)
        // Reload forms list
        const formsResult = await fetchLeadForms(session?.user?.company_id)
        if (formsResult.success && formsResult.forms) {
          setForms(formsResult.forms)
        }
        setDeleteForm(null)
      } else {
        toastError(result.error || 'Failed to delete form')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while deleting the form')
    } finally {
      setDeleting(false)
    }
  }

  const handleTemplateSelect = async (template: FormTemplate) => {
    if (!session?.user?.id) {
      toastError('You must be logged in to create forms')
      return
    }

    try {
      // Create form from template
      const result = await createLeadForm({
        space_id: session.user.company_id,
        name: template.name,
        title: template.name,
        description: template.description,
        ai_personalization_enabled: true,
        fields: template.fields.map((field, index) => ({
          field_type: field.type,
          label: field.label,
          placeholder: field.placeholder,
          is_required: field.required,
          field_order: index,
          options: field.options || [],
        })),
      })

      if (result.success) {
        toastSuccess(`Form "${template.name}" created successfully`)
        // Reload forms list
        const formsResult = await fetchLeadForms(session.user.company_id)
        if (formsResult.success && formsResult.forms) {
          setForms(formsResult.forms)
        }
        // Switch to Forms tab to show the new form
        const formsTab = document.querySelector('[value="forms"]') as HTMLElement
        if (formsTab) formsTab.click()
      } else {
        toastError(result.error || 'Failed to create form from template')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while creating the form')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lead Capture Forms</h2>
          <p className="text-muted-foreground">Create and manage lead capture forms</p>
        </div>
        <Button variant="outline" onClick={() => {
          setEditingForm(null)
          setShowFormBuilder(true)
        }}>
          <Plus className="w-4 h-4 mr-2" />
          New Form
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-4">
          {showFormBuilder ? (
            <Card>
              <CardHeader>
                <CardTitle>Form Builder</CardTitle>
                <CardDescription>
                  Create custom lead capture forms with AI-powered personalization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeadFormBuilder 
                  onFormCreated={handleFormCreated} 
                  form={editingForm}
                />
                <div className="mt-4">
                  <Button variant="outline" onClick={() => {
                    setShowFormBuilder(false)
                    setEditingForm(null)
                  }}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading forms...</div>
              ) : forms.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No forms created yet</p>
                    <Button onClick={() => setShowFormBuilder(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Form
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {forms.map((form) => (
                    <Card key={form.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{form.name}</CardTitle>
                            <CardDescription className="mt-1">{form.title}</CardDescription>
                          </div>
                          <Badge variant={form.is_active ? 'default' : 'secondary'}>
                            {form.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {form.description && (
                          <p className="text-sm text-muted-foreground mb-4">{form.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewForm(form)}
                            title="Preview form"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGetCode(form.id)}
                          >
                            <Code className="w-4 h-4 mr-2" />
                            Get Code
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditForm(form)}
                            title="Edit form"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setDeleteForm(form)}
                            title="Delete form"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <FormTemplates onSelectTemplate={handleTemplateSelect} />
        </TabsContent>

        <TabsContent value="embed" className="space-y-4">
          <EmbedCode formId={activeForm} />
        </TabsContent>
      </Tabs>

      {/* Form Preview Modal */}
      <FormPreviewModal
        isOpen={previewForm !== null}
        onClose={() => setPreviewForm(null)}
        form={previewForm}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteForm !== null}
        onClose={() => setDeleteForm(null)}
        onConfirm={handleDeleteForm}
        itemName={deleteForm?.name || ''}
        isLoading={deleting}
      />
    </div>
  )
}

