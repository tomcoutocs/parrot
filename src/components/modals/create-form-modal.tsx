"use client"

import { useState } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { createForm } from '@/lib/database-functions'
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
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { FormField } from '@/lib/supabase'

interface CreateFormModalProps {
  isOpen: boolean
  onClose: () => void
  onFormCreated: () => void
}

export default function CreateFormModal({ isOpen, onClose, onFormCreated }: CreateFormModalProps) {
  const { data: session } = useSession()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Dropdown' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'date', label: 'Date' },
  ]

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
      placeholder: '',
      options: [],
      validation: {}
    }
    setFields([...fields, newField])
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...fields]
    updatedFields[index] = { ...updatedFields[index], ...updates }
    setFields(updatedFields)
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const addOption = (fieldIndex: number) => {
    const updatedFields = [...fields]
    if (!updatedFields[fieldIndex].options) {
      updatedFields[fieldIndex].options = []
    }
    updatedFields[fieldIndex].options!.push('')
    setFields(updatedFields)
  }

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const updatedFields = [...fields]
    if (updatedFields[fieldIndex].options) {
      updatedFields[fieldIndex].options![optionIndex] = value
      setFields(updatedFields)
    }
  }

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const updatedFields = [...fields]
    if (updatedFields[fieldIndex].options) {
      updatedFields[fieldIndex].options = updatedFields[fieldIndex].options!.filter((_, i) => i !== optionIndex)
      setFields(updatedFields)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Form title is required')
      return
    }

    if (fields.length === 0) {
      setError('At least one field is required')
      return
    }

    // Validate fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      if (!field.label.trim()) {
        setError(`Field ${i + 1} label is required`)
        return
      }
      if ((field.type === 'select' || field.type === 'radio') && (!field.options || field.options.length === 0)) {
        setError(`Field '${field.label}' requires at least one option`)
        return
      }
    }

    if (!session?.user?.id) {
      setError('You must be logged in to create a form')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = {
        title: title.trim(),
        description: description.trim() || undefined,
        fields: fields,
        is_active: true
      }

      console.log('Creating form with data:', formData)
      const result = await createForm(formData, session.user.id)
      console.log('Create form result:', result)
      
      if (result.success && result.data) {
        // Reset form
        setTitle('')
        setDescription('')
        setFields([])
        setError('')
        
        // Close modal and refresh forms
        onFormCreated()
        onClose()
      } else {
        setError(result.error || 'Failed to create form. Please try again.')
      }
    } catch (error) {
      console.error('Error creating form:', error)
      setError('An error occurred while creating the form')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setTitle('')
      setDescription('')
      setFields([])
      setError('')
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Form</DialogTitle>
          <DialogDescription>
            Create a new form to collect information from your clients.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Form Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Form Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter form title"
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
                placeholder="Describe what this form is for"
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Form Fields *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addField}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            {fields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No fields added yet. Click &quot;Add Field&quot; to get started.</p>
              </div>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Field {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(index)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Field Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) => updateField(index, { type: value as FormField['type'] })}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Label *</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      placeholder="Field label"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Placeholder</Label>
                    <Input
                      value={field.placeholder || ''}
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                      placeholder="Optional placeholder text"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`required-${index}`}
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        disabled={loading}
                      />
                      <Label htmlFor={`required-${index}`}>Required field</Label>
                    </div>
                  </div>
                </div>

                {/* Options for select/radio fields */}
                {(field.type === 'select' || field.type === 'radio') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Options *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(index)}
                        disabled={loading}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(field.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <Input
                            value={option}
                            onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            disabled={loading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index, optionIndex)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
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
            <Button type="submit" disabled={loading || !title.trim() || fields.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Form'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 