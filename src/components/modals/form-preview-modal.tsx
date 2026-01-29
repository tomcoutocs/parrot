"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchLeadFormFields, type LeadForm, type LeadFormField } from '@/lib/database-functions'

interface FormPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  form: LeadForm | null
}

export function FormPreviewModal({ isOpen, onClose, form }: FormPreviewModalProps) {
  const [fields, setFields] = useState<LeadFormField[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadFields = async () => {
      if (!form || !isOpen) {
        setFields([])
        return
      }

      setLoading(true)
      try {
        const result = await fetchLeadFormFields(form.id)
        if (result.success && result.fields) {
          setFields(result.fields.sort((a, b) => a.field_order - b.field_order))
        }
      } catch (error) {
        console.error('Error loading form fields:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFields()
  }, [form, isOpen])

  const renderField = (field: LeadFormField) => {
    const isRequired = field.is_required

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.field_type === 'email' ? 'email' : field.field_type === 'number' ? 'number' : 'text'}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              disabled
              className="bg-muted"
            />
          </div>
        )

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              disabled
              rows={4}
              className="bg-muted"
            />
          </div>
        )

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select disabled>
              <SelectTrigger className="bg-muted">
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options && field.options.length > 0 ? (
                  field.options.map((option, index) => (
                    <SelectItem key={index} value={String(option)}>
                      {String(option)}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="placeholder" disabled>
                    No options available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options && field.options.length > 0 ? (
                field.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${field.id}-${index}`}
                      name={field.id}
                      disabled
                      className="accent-primary"
                    />
                    <Label htmlFor={`${field.id}-${index}`} className="text-sm font-normal cursor-not-allowed">
                      {String(option)}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No options available</p>
              )}
            </div>
          </div>
        )

      case 'checkbox':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={field.id}
                disabled
                className="accent-primary"
              />
              <Label htmlFor={field.id} className="text-sm font-medium cursor-not-allowed">
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
          </div>
        )

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              disabled
              className="bg-muted"
            />
          </div>
        )

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="text"
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              disabled
              className="bg-muted"
            />
          </div>
        )
    }
  }

  if (!form) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Form Header */}
          <div className="space-y-2 border-b pb-4">
            <h2 className="text-2xl font-bold">{form.title}</h2>
            {form.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
          </div>

          {/* Form Fields */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading form fields...</div>
          ) : fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fields in this form yet
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.id}>
                  {renderField(field)}
                </div>
              ))}
            </div>
          )}

          {/* Submit Button (disabled for preview) */}
          <div className="pt-4 border-t">
            <Button disabled className="w-full">
              Submit Form (Preview)
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              This is a preview. Form fields are disabled.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
