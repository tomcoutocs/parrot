"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { submitForm } from '@/lib/database-functions'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Form, FormField } from '@/lib/supabase'

interface FillFormModalProps {
  isOpen: boolean
  onClose: () => void
  onFormSubmitted: () => void
  form: Form
}

export default function FillFormModal({ isOpen, onClose, onFormSubmitted, form }: FillFormModalProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Reset form data when modal opens
  useEffect(() => {
    if (isOpen && form) {
      const initialData: Record<string, unknown> = {}
      form.fields.forEach(field => {
        if (field.type === 'checkbox') {
          initialData[field.id] = false
        } else {
          initialData[field.id] = ''
        }
      })
      setFormData(initialData)
      setError('')
      setSuccess(false)
    }
  }, [isOpen, form])

  const updateFieldValue = (fieldId: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const validateForm = () => {
    for (const field of form.fields) {
      if (field.required) {
        const value = formData[field.id]
        if (value === '' || value === null || value === undefined) {
          return `Field "${field.label}" is required`
        }
      }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!session?.user?.id) {
      setError('You must be logged in to submit a form')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Submitting form with data:', formData)
      const result = await submitForm(form.id, formData, session.user.id)
      console.log('Submit form result:', result)
      
      if (result.success && result.data) {
        setSuccess(true)
        setTimeout(() => {
          onFormSubmitted()
          onClose()
        }, 2000)
      } else {
        setError(result.error || 'Failed to submit form. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setError('An error occurred while submitting the form')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  const renderField = (field: FormField) => {
    const value = formData[field.id]
    const isRequired = field.required

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              value={String(value || '')}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={isRequired}
              disabled={loading}
            />
          </div>
        )

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={String(value || '')}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={isRequired}
              disabled={loading}
              rows={4}
            />
          </div>
        )

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={String(value || '')}
              onValueChange={(val) => updateFieldValue(field.id, val)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            <Label>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${field.id}-${index}`}
                    name={field.id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => updateFieldValue(field.id, e.target.value)}
                    disabled={loading}
                    required={isRequired}
                  />
                  <Label htmlFor={`${field.id}-${index}`} className="text-sm">
                    {option}
                  </Label>
                </div>
              ))}
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
                checked={Boolean(value)}
                onChange={(e) => updateFieldValue(field.id, e.target.checked)}
                disabled={loading}
                required={isRequired}
              />
              <Label htmlFor={field.id}>
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
          </div>
        )

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={String(value || '')}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              required={isRequired}
              disabled={loading}
            />
          </div>
        )

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              value={String(value || '')}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={isRequired}
              disabled={loading}
            />
          </div>
        )
    }
  }

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
              Form Submitted Successfully!
            </DialogTitle>
            <DialogDescription>
              Thank you for your submission. Your response has been recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-600">
              You will be redirected back to the forms list shortly...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.title}</DialogTitle>
          <DialogDescription>
            {form.description || 'Please fill out all required fields.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Fields */}
          <div className="space-y-6">
            {form.fields.map((field, index) => (
              <Card key={field.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Field {index + 1}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderField(field)}
                </CardContent>
              </Card>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Form'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 