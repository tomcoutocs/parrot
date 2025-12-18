"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, GripVertical, Save } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createLeadForm } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

type FieldType = 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'number' | 'checkbox' | 'date' | 'url'

interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
}

interface LeadFormBuilderProps {
  onFormCreated?: () => void
}

export function LeadFormBuilder({ onFormCreated }: LeadFormBuilderProps = {}) {
  const { data: session } = useSession()
  const [formName, setFormName] = useState('')
  const [formTitle, setFormTitle] = useState('New Lead Form')
  const [formDescription, setFormDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>([
    { id: '1', type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true },
    { id: '2', type: 'email', label: 'Email', placeholder: 'Enter your email', required: true },
  ])
  const [aiPersonalization, setAiPersonalization] = useState(true)
  const [saving, setSaving] = useState(false)

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: '',
      required: false,
    }
    if (type === 'select') {
      newField.options = []
    }
    setFields([...fields, newField])
  }

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id))
  }

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const handleSave = async () => {
    if (!session?.user?.id) {
      toastError('You must be logged in to save forms')
      return
    }

    if (!formName.trim()) {
      toastError('Please enter a form name')
      return
    }

    if (fields.length === 0) {
      toastError('Please add at least one field to the form')
      return
    }

    setSaving(true)

    try {
      const result = await createLeadForm({
        space_id: session.user.company_id,
        name: formName,
        title: formTitle,
        description: formDescription || undefined,
        ai_personalization_enabled: aiPersonalization,
        fields: fields.map((field, index) => ({
          field_type: field.type,
          label: field.label,
          placeholder: field.placeholder,
          is_required: field.required,
          field_order: index,
          options: field.options || [],
        })),
      })

      if (result.success) {
        toastSuccess('Form saved successfully')
        // Reset form
        setFormName('')
        setFormTitle('New Lead Form')
        setFormDescription('')
        setFields([
          { id: '1', type: 'text', label: 'Full Name', placeholder: 'Enter your full name', required: true },
          { id: '2', type: 'email', label: 'Email', placeholder: 'Enter your email', required: true },
        ])
        // Call callback if provided
        if (onFormCreated) {
          onFormCreated()
        }
      } else {
        toastError(result.error || 'Failed to save form')
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Builder */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Form Configuration</CardTitle>
            <CardDescription>Customize your lead capture form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Form Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter form name (internal)"
              />
            </div>
            <div className="space-y-2">
              <Label>Form Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Enter form title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Enter form description"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>AI Personalization</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically personalize forms based on visitor data
                </p>
              </div>
              <Switch
                checked={aiPersonalization}
                onCheckedChange={setAiPersonalization}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Form Fields</CardTitle>
                <CardDescription>Add and configure form fields</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select onValueChange={(value) => addField(value as FieldType)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Add Field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Form'}
              </Button>
            </div>
            {fields.map((field) => (
              <Card key={field.id} className="p-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="w-5 h-5 text-muted-foreground mt-1" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder="Field label"
                        className="flex-1"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(value) => updateField(field.id, { type: value as FieldType })}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(field.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {field.type !== 'checkbox' && (
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        placeholder="Placeholder text"
                      />
                    )}
                    {field.type === 'select' && (
                      <div className="space-y-2">
                        <Label className="text-xs">Options (one per line)</Label>
                        <Textarea
                          value={field.options?.join('\n') || ''}
                          onChange={(e) => updateField(field.id, {
                            options: e.target.value.split('\n').filter(o => o.trim())
                          })}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          rows={3}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                      />
                      <Label className="text-sm">Required field</Label>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Form Preview */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Form Preview</CardTitle>
            <CardDescription>See how your form will look</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 p-4 border rounded-lg">
              <div>
                <h3 className="text-lg font-semibold">{formTitle}</h3>
                {formDescription && (
                  <p className="text-sm text-muted-foreground mt-1">{formDescription}</p>
                )}
              </div>
              {fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  {field.type === 'text' && (
                    <Input placeholder={field.placeholder} disabled />
                  )}
                  {field.type === 'email' && (
                    <Input type="email" placeholder={field.placeholder} disabled />
                  )}
                  {field.type === 'phone' && (
                    <Input type="tel" placeholder={field.placeholder} disabled />
                  )}
                  {field.type === 'select' && (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || 'Select an option'} />
                      </SelectTrigger>
                    </Select>
                  )}
                  {field.type === 'textarea' && (
                    <Textarea placeholder={field.placeholder} disabled />
                  )}
                  {field.type === 'number' && (
                    <Input type="number" placeholder={field.placeholder} disabled />
                  )}
                  {field.type === 'checkbox' && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" disabled />
                      <Label className="font-normal">{field.label}</Label>
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" className="w-full">Submit</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

