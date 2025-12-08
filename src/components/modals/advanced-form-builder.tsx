"use client"

import { useState, useCallback, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { createForm, updateForm } from '@/lib/database-functions'
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
import { X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Loader2, 
  Plus, 
  Trash2, 
  GripVertical, 
  Eye,
  Settings,
  Copy,
  MoveUp,
  MoveDown,
  FileText,
  Hash,
  Mail,
  Calendar,
  List,
  CheckSquare,
  Star,
  Sliders,
  Grid3x3,
  Upload,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  Type,
  AlignLeft,
  Layers
} from 'lucide-react'
import { FormField, Form } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// Sub-question interface
export interface SubQuestion {
  id: string
  label: string
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'date'
  required: boolean
  placeholder?: string
  options?: string[]
  order: number
}

// Extended FormField interface with conditional logic and new types
export interface AdvancedFormField extends Omit<FormField, 'type'> {
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 
        'rating' | 'scale' | 'matrix' | 'file' | 'image' | 'video' | 'url' | 'longtext' | 'group'
  conditionalLogic?: {
    showIf?: {
      fieldId: string
      operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan'
      value: string | number | boolean
    }
  }
  properties?: {
    min?: number
    max?: number
    step?: number
    scaleLabels?: { min: string; max: string }
    matrixRows?: string[]
    matrixColumns?: string[]
    allowedFileTypes?: string[]
    maxFileSize?: number
    ratingMax?: number
    ratingIcon?: 'star' | 'heart' | 'thumb'
    subQuestions?: SubQuestion[]
  }
  helpText?: string
  order: number
}

interface FormTheme {
  primaryColor?: string
  backgroundColor?: string
  textColor?: string
  fontFamily?: string
  conversational?: boolean
}

interface AdvancedFormBuilderProps {
  isOpen: boolean
  onClose: () => void
  onFormCreated: () => void
  form?: Form | null // For editing
}

const questionTypes = [
  { value: 'text', label: 'Short Text', icon: Type, description: 'Single line text input' },
  { value: 'longtext', label: 'Long Text', icon: AlignLeft, description: 'Multi-line text area' },
  { value: 'email', label: 'Email', icon: Mail, description: 'Email address input' },
  { value: 'number', label: 'Number', icon: Hash, description: 'Numeric input' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { value: 'select', label: 'Dropdown', icon: List, description: 'Single choice dropdown' },
  { value: 'radio', label: 'Multiple Choice', icon: CheckSquare, description: 'Single choice radio buttons' },
  { value: 'checkbox', label: 'Checkboxes', icon: CheckSquare, description: 'Multiple choice checkboxes' },
  { value: 'rating', label: 'Rating', icon: Star, description: 'Star or emoji rating' },
  { value: 'scale', label: 'Scale', icon: Sliders, description: 'Numeric scale (e.g., 1-10)' },
  { value: 'matrix', label: 'Matrix', icon: Grid3x3, description: 'Grid of questions' },
  { value: 'group', label: 'Sub-Questions', icon: Layers, description: 'Group with multiple sub-questions' },
  { value: 'file', label: 'File Upload', icon: Upload, description: 'File attachment' },
  { value: 'image', label: 'Image Upload', icon: ImageIcon, description: 'Image file' },
  { value: 'video', label: 'Video Upload', icon: Video, description: 'Video file' },
  { value: 'url', label: 'Website URL', icon: LinkIcon, description: 'Web link' },
]

export default function AdvancedFormBuilder({ 
  isOpen, 
  onClose, 
  onFormCreated,
  form 
}: AdvancedFormBuilderProps) {
  const { data: session } = useSession()
  
  // Extract description without theme JSON
  const extractDescription = (desc?: string): string => {
    if (!desc) return ''
    return desc.replace(/__THEME__{.*?}__THEME__/g, '').trim()
  }
  
  const [title, setTitle] = useState(form?.title || '')
  const [description, setDescription] = useState(extractDescription(form?.description))
  const [fields, setFields] = useState<AdvancedFormField[]>(
    form?.fields.map((f, idx) => ({ ...f, order: idx })) || []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'builder' | 'preview' | 'theme'>('builder')
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [draggedField, setDraggedField] = useState<string | null>(null)
  // Parse theme from form description
  const parseThemeFromForm = (desc?: string): FormTheme => {
    if (!desc) {
      return {
        primaryColor: '#f97316',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        fontFamily: 'inherit',
        conversational: false
      }
    }
    try {
      // Use a more robust regex that handles multiline JSON
      const themeMatch = desc.match(/__THEME__({[\s\S]*?})__THEME__/)
      if (themeMatch) {
        const parsed = JSON.parse(themeMatch[1])
        console.log('Parsed theme from form:', parsed)
        return parsed
      }
    } catch (e) {
      console.error('Error parsing theme:', e)
      // Ignore parse errors
    }
    return {
      primaryColor: '#f97316',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      fontFamily: 'inherit',
      conversational: false
    }
  }

  const [theme, setTheme] = useState<FormTheme>(parseThemeFromForm(form?.description))

  // Update state when form prop changes
  useEffect(() => {
    if (form) {
      setTitle(form.title || '')
      setDescription(extractDescription(form.description))
      // Parse fields and restore conditional logic and properties from validation
      const parsedFields: AdvancedFormField[] = (form.fields || []).map((f, idx) => {
        const validation = f.validation as any || {}
        let conditionalLogic
        try {
          if (validation.conditionalLogic) {
            conditionalLogic = typeof validation.conditionalLogic === 'string' 
              ? JSON.parse(validation.conditionalLogic)
              : validation.conditionalLogic
          }
        } catch (e) {
          // Ignore parse errors
        }
        return {
          ...f,
          order: idx,
          conditionalLogic,
          properties: {
            ...validation,
            conditionalLogic: undefined,
            helpText: undefined
          },
          helpText: (validation as any).helpText || f.helpText
        } as AdvancedFormField
      })
      setFields(parsedFields)
      setTheme(parseThemeFromForm(form.description))
    } else {
      setTitle('')
      setDescription('')
      setFields([])
      setTheme({
        primaryColor: '#f97316',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        fontFamily: 'inherit',
        conversational: false
      })
    }
  }, [form])

  const addField = (type: AdvancedFormField['type']) => {
    const newField: AdvancedFormField = {
      id: `field_${Date.now()}`,
      type,
      label: '',
      required: false,
      placeholder: '',
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? [''] : undefined,
      validation: {},
      order: fields.length,
      properties: type === 'rating' 
        ? { ratingMax: 5, ratingIcon: 'star' } 
        : type === 'group'
        ? { subQuestions: [] }
        : undefined
    }
    setFields([...fields, newField])
    setSelectedField(newField.id)
  }

  const updateField = (fieldId: string, updates: Partial<AdvancedFormField>) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f))
  }

  const removeField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId))
    if (selectedField === fieldId) {
      setSelectedField(null)
    }
  }

  const duplicateField = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId)
    if (field) {
      const newField: AdvancedFormField = {
        ...field,
        id: `field_${Date.now()}`,
        label: `${field.label} (Copy)`,
        order: fields.length
      }
      setFields([...fields, newField])
      setSelectedField(newField.id)
    }
  }

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const index = fields.findIndex(f => f.id === fieldId)
    if (index === -1) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= fields.length) return

    const newFields = [...fields]
    const [moved] = newFields.splice(index, 1)
    newFields.splice(newIndex, 0, moved)
    
    // Update order
    const updatedFields = newFields.map((f, idx) => ({ ...f, order: idx }))
    setFields(updatedFields)
  }

  const handleDragStart = (fieldId: string) => {
    setDraggedField(fieldId)
  }

  const handleDragOver = (e: React.DragEvent, fieldId: string) => {
    e.preventDefault()
    if (!draggedField || draggedField === fieldId) return

    const draggedIndex = fields.findIndex(f => f.id === draggedField)
    const targetIndex = fields.findIndex(f => f.id === fieldId)
    
    if (draggedIndex === -1 || targetIndex === -1) return

    const newFields = [...fields]
    const [moved] = newFields.splice(draggedIndex, 1)
    newFields.splice(targetIndex, 0, moved)
    
    const updatedFields = newFields.map((f, idx) => ({ ...f, order: idx }))
    setFields(updatedFields)
  }

  const handleDragEnd = () => {
    setDraggedField(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Form title is required')
      return
    }

    if (fields.length === 0) {
      setError('At least one question is required')
      return
    }

    // Validate fields
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      if (!field.label.trim()) {
        setError(`Question ${i + 1} label is required`)
        return
      }
      if ((field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && 
          (!field.options || field.options.length === 0)) {
        setError(`Question '${field.label}' requires at least one option`)
        return
      }
      if (field.type === 'group') {
        if (!field.properties?.subQuestions || field.properties.subQuestions.length === 0) {
          setError(`Question '${field.label}' requires at least one sub-question`)
          return
        }
        // Validate sub-questions
        for (let j = 0; j < field.properties.subQuestions.length; j++) {
          const subQ = field.properties.subQuestions[j]
          if (!subQ.label.trim()) {
            setError(`Sub-question ${j + 1} in '${field.label}' requires a label`)
            return
          }
          if ((subQ.type === 'select' || subQ.type === 'radio' || subQ.type === 'checkbox') && 
              (!subQ.options || subQ.options.length === 0)) {
            setError(`Sub-question '${subQ.label}' in '${field.label}' requires at least one option`)
            return
          }
        }
      }
    }

    if (!session?.user?.id) {
      setError('You must be logged in to create a form')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Convert AdvancedFormField back to FormField for storage
      // Store conditional logic and properties in validation object as metadata
      const formFields = fields.map(({ order, conditionalLogic, properties, helpText, ...field }) => ({
        ...field,
        validation: {
          ...field.validation,
          ...properties,
          conditionalLogic: conditionalLogic ? JSON.stringify(conditionalLogic) : undefined,
          helpText: helpText
        } as any
      })) as FormField[]

      // Store theme in description as JSON (temporary solution until schema update)
      // Ensure theme has all required properties with defaults
      const themeToSave: FormTheme = {
        primaryColor: theme.primaryColor || '#f97316',
        backgroundColor: theme.backgroundColor || '#ffffff',
        textColor: theme.textColor || '#000000',
        fontFamily: theme.fontFamily || 'inherit',
        conversational: theme.conversational || false
      }
      const themeJson = JSON.stringify(themeToSave)
      console.log('Saving theme:', themeToSave)
      console.log('Theme JSON:', themeJson)
      
      // Remove any existing theme from description before adding new one
      const cleanDescription = description.trim().replace(/__THEME__{[\s\S]*?}__THEME__/g, '').trim()
      const finalDescription = cleanDescription
        ? `${cleanDescription}\n__THEME__${themeJson}__THEME__`
        : `__THEME__${themeJson}__THEME__`
      
      console.log('Final description:', finalDescription)

      const formData = {
        title: title.trim(),
        description: finalDescription,
        fields: formFields,
        is_active: true
      }

      if (form) {
        // Update existing form
        const result = await updateForm(form.id, formData, session.user.id)
        if (result.success) {
          onFormCreated()
          onClose()
        } else {
          setError(result.error || 'Failed to update form')
        }
      } else {
        // Create new form
        const result = await createForm(formData, session.user.id)
        if (result.success && result.data) {
          setTitle('')
          setDescription('')
          setFields([])
          setError('')
          onFormCreated()
          onClose()
        } else {
          setError(result.error || 'Failed to create form')
        }
      }
    } catch (error) {
      console.error('Error saving form:', error)
      setError('An error occurred while saving the form')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (!form) {
        setTitle('')
        setDescription('')
        setFields([])
      }
      setError('')
      setActiveTab('builder')
      setSelectedField(null)
    }
    onClose()
  }

  const selectedFieldData = fields.find(f => f.id === selectedField)

  // Track sidebar width to adjust form builder position
  const [sidebarWidth, setSidebarWidth] = useState(240) // Default to w-60 (240px)
  
  useEffect(() => {
    const checkSidebarWidth = () => {
      // Find the sidebar element - it has either w-60 or w-16 class
      const sidebar = document.querySelector('[class*="bg-sidebar"][class*="border-r"]')
      if (sidebar) {
        const width = sidebar.getBoundingClientRect().width
        setSidebarWidth(width)
      }
    }
    
    // Check initially
    checkSidebarWidth()
    
    // Watch for class changes using MutationObserver
    const observer = new MutationObserver(checkSidebarWidth)
    const sidebar = document.querySelector('[class*="bg-sidebar"]')
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class'],
        childList: false,
        subtree: false
      })
    }
    
    // Also check on resize and periodically to catch transitions
    window.addEventListener('resize', checkSidebarWidth)
    const interval = setInterval(checkSidebarWidth, 100) // Check every 100ms during transitions
    
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', checkSidebarWidth)
      clearInterval(interval)
    }
  }, [])

  if (!isOpen) return null

  return (
    <div 
      className="fixed top-14 right-0 bottom-0 bg-background flex flex-col overflow-hidden z-40 transition-[left] duration-200 ease-linear"
      style={{ left: `${sidebarWidth}px` }}
    >
      {/* Header */}
      <div className="border-b bg-background flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">
                {form ? 'Edit Form' : 'Create New Form'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Build beautiful, interactive forms with drag-and-drop, conditional logic, and real-time preview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-md">
                {error}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !title.trim() || fields.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {form ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                form ? 'Update Form' : 'Create Form'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'builder' | 'preview' | 'theme')} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <TabsList className="mx-6 mt-4 flex-shrink-0">
            <TabsTrigger value="builder">Form Builder</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="theme">Theme & Style</TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="flex-1 overflow-hidden flex gap-6 px-6 pb-6 mt-4 min-h-0">
            {/* Left Sidebar - Question Types */}
            <div className="w-64 border-r pr-4 overflow-y-auto flex-shrink-0">
              <div className="space-y-2">
                <Label className="text-sm font-semibold mb-3 block">Question Types</Label>
                {questionTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.value}
                      onClick={() => addField(type.value as AdvancedFormField['type'])}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{type.label}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{type.description}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Center - Form Builder */}
            <div className="flex-1 overflow-y-auto min-w-0">
              <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto px-2 sm:px-0">
                {/* Form Settings */}
                <Card>
                  <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    <div className="space-y-2">
                      <Label>Form Title *</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter form title"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what this form is for"
                        rows={2}
                        disabled={loading}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Questions List */}
                <div className="space-y-3">
                  {fields.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No questions yet. Add your first question from the sidebar.</p>
                      </CardContent>
                    </Card>
                  )}

                  {fields.map((field, index) => (
                    <Card
                      key={field.id}
                      className={cn(
                        "transition-all cursor-pointer",
                        selectedField === field.id && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedField(field.id)}
                      draggable
                      onDragStart={() => handleDragStart(field.id)}
                      onDragOver={(e) => handleDragOver(e, field.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 cursor-move text-muted-foreground hover:text-foreground">
                            <GripVertical className="h-5 w-5" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Question {index + 1}
                                </span>
                                {field.required && (
                                  <span className="text-xs text-red-500">Required</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    moveField(field.id, 'up')
                                  }}
                                  disabled={index === 0}
                                >
                                  <MoveUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    moveField(field.id, 'down')
                                  }}
                                  disabled={index === fields.length - 1}
                                >
                                  <MoveDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    duplicateField(field.id)
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeField(field.id)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <div className="font-medium mb-1">
                                {field.label || 'Untitled Question'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {field.type} {field.helpText && `• ${field.helpText}`}
                                {field.type === 'group' && field.properties?.subQuestions && (
                                  <span className="ml-1">• {field.properties.subQuestions.length} sub-question{field.properties.subQuestions.length !== 1 ? 's' : ''}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Field Settings */}
            {selectedFieldData && (
              <div className="w-80 border-l pl-4 overflow-y-auto flex-shrink-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Question Settings</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedField(null)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question Label *</Label>
                      <Input
                        value={selectedFieldData.label}
                        onChange={(e) => updateField(selectedFieldData.id, { label: e.target.value })}
                        placeholder="Enter question"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Help Text</Label>
                      <Input
                        value={selectedFieldData.helpText || ''}
                        onChange={(e) => updateField(selectedFieldData.id, { helpText: e.target.value })}
                        placeholder="Additional instructions"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Placeholder</Label>
                      <Input
                        value={selectedFieldData.placeholder || ''}
                        onChange={(e) => updateField(selectedFieldData.id, { placeholder: e.target.value })}
                        placeholder="Placeholder text"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="required"
                        checked={selectedFieldData.required}
                        onChange={(e) => updateField(selectedFieldData.id, { required: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="required">Required</Label>
                    </div>

                    {/* Type-specific settings */}
                    {(selectedFieldData.type === 'select' || 
                      selectedFieldData.type === 'radio' || 
                      selectedFieldData.type === 'checkbox') && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {(selectedFieldData.options || []).map((option, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(selectedFieldData.options || [])]
                                newOptions[idx] = e.target.value
                                updateField(selectedFieldData.id, { options: newOptions })
                              }}
                              placeholder={`Option ${idx + 1}`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newOptions = (selectedFieldData.options || []).filter((_, i) => i !== idx)
                                updateField(selectedFieldData.id, { options: newOptions })
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newOptions = [...(selectedFieldData.options || []), '']
                            updateField(selectedFieldData.id, { options: newOptions })
                          }}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </Button>
                      </div>
                    )}

                    {selectedFieldData.type === 'rating' && (
                      <div className="space-y-2">
                        <Label>Max Rating</Label>
                        <Input
                          type="number"
                          value={selectedFieldData.properties?.ratingMax || 5}
                          onChange={(e) => updateField(selectedFieldData.id, {
                            properties: {
                              ...selectedFieldData.properties,
                              ratingMax: parseInt(e.target.value) || 5
                            }
                          })}
                          min={2}
                          max={10}
                        />
                      </div>
                    )}

                    {selectedFieldData.type === 'scale' && (
                      <div className="space-y-2">
                        <Label>Min Value</Label>
                        <Input
                          type="number"
                          value={selectedFieldData.properties?.min || 1}
                          onChange={(e) => updateField(selectedFieldData.id, {
                            properties: {
                              ...selectedFieldData.properties,
                              min: parseInt(e.target.value) || 1
                            }
                          })}
                        />
                        <Label>Max Value</Label>
                        <Input
                          type="number"
                          value={selectedFieldData.properties?.max || 10}
                          onChange={(e) => updateField(selectedFieldData.id, {
                            properties: {
                              ...selectedFieldData.properties,
                              max: parseInt(e.target.value) || 10
                            }
                          })}
                        />
                      </div>
                    )}

                    {selectedFieldData.type === 'group' && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Sub-Questions</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const subQuestions = selectedFieldData.properties?.subQuestions || []
                              const newSubQuestion: SubQuestion = {
                                id: `sub_${Date.now()}`,
                                label: '',
                                type: 'text',
                                required: false,
                                order: subQuestions.length
                              }
                              updateField(selectedFieldData.id, {
                                properties: {
                                  ...selectedFieldData.properties,
                                  subQuestions: [...subQuestions, newSubQuestion]
                                }
                              })
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Sub-Question
                          </Button>
                        </div>
                        
                        {(selectedFieldData.properties?.subQuestions || []).map((subQ, idx) => (
                          <Card key={subQ.id} className="p-3 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                Sub-Question {idx + 1}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const subQuestions = selectedFieldData.properties?.subQuestions || []
                                  updateField(selectedFieldData.id, {
                                    properties: {
                                      ...selectedFieldData.properties,
                                      subQuestions: subQuestions.filter(sq => sq.id !== subQ.id).map((sq, i) => ({ ...sq, order: i }))
                                    }
                                  })
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-xs">Question Label</Label>
                              <Input
                                value={subQ.label}
                                onChange={(e) => {
                                  const subQuestions = selectedFieldData.properties?.subQuestions || []
                                  updateField(selectedFieldData.id, {
                                    properties: {
                                      ...selectedFieldData.properties,
                                      subQuestions: subQuestions.map(sq => 
                                        sq.id === subQ.id ? { ...sq, label: e.target.value } : sq
                                      )
                                    }
                                  })
                                }}
                                placeholder="Enter sub-question"
                                className="text-sm"
                              />
                              
                              <div className="flex items-center gap-2">
                                <Label className="text-xs flex-1">Type</Label>
                                <Select
                                  value={subQ.type}
                                  onValueChange={(type) => {
                                    const subQuestions = selectedFieldData.properties?.subQuestions || []
                                    updateField(selectedFieldData.id, {
                                      properties: {
                                        ...selectedFieldData.properties,
                                        subQuestions: subQuestions.map(sq => 
                                          sq.id === subQ.id 
                                            ? { 
                                                ...sq, 
                                                type: type as SubQuestion['type'],
                                                options: (type === 'select' || type === 'radio' || type === 'checkbox') ? [''] : undefined
                                              } 
                                            : sq
                                        )
                                      }
                                    })
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="textarea">Textarea</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="select">Dropdown</SelectItem>
                                    <SelectItem value="radio">Radio</SelectItem>
                                    <SelectItem value="checkbox">Checkbox</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {(subQ.type === 'select' || subQ.type === 'radio' || subQ.type === 'checkbox') && (
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Options</Label>
                                  {(subQ.options || []).map((opt, optIdx) => (
                                    <div key={optIdx} className="flex gap-1">
                                      <Input
                                        value={opt}
                                        onChange={(e) => {
                                          const subQuestions = selectedFieldData.properties?.subQuestions || []
                                          const updatedOptions = [...(subQ.options || [])]
                                          updatedOptions[optIdx] = e.target.value
                                          updateField(selectedFieldData.id, {
                                            properties: {
                                              ...selectedFieldData.properties,
                                              subQuestions: subQuestions.map(sq => 
                                                sq.id === subQ.id ? { ...sq, options: updatedOptions } : sq
                                              )
                                            }
                                          })
                                        }}
                                        placeholder={`Option ${optIdx + 1}`}
                                        className="text-xs h-7"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const subQuestions = selectedFieldData.properties?.subQuestions || []
                                          const updatedOptions = (subQ.options || []).filter((_, i) => i !== optIdx)
                                          updateField(selectedFieldData.id, {
                                            properties: {
                                              ...selectedFieldData.properties,
                                              subQuestions: subQuestions.map(sq => 
                                                sq.id === subQ.id ? { ...sq, options: updatedOptions } : sq
                                              )
                                            }
                                          })
                                        }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const subQuestions = selectedFieldData.properties?.subQuestions || []
                                      const updatedOptions = [...(subQ.options || []), '']
                                      updateField(selectedFieldData.id, {
                                        properties: {
                                          ...selectedFieldData.properties,
                                          subQuestions: subQuestions.map(sq => 
                                            sq.id === subQ.id ? { ...sq, options: updatedOptions } : sq
                                          )
                                        }
                                      })
                                    }}
                                    className="w-full h-7 text-xs"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Option
                                  </Button>
                                </div>
                              )}

                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={subQ.required}
                                  onChange={(e) => {
                                    const subQuestions = selectedFieldData.properties?.subQuestions || []
                                    updateField(selectedFieldData.id, {
                                      properties: {
                                        ...selectedFieldData.properties,
                                        subQuestions: subQuestions.map(sq => 
                                          sq.id === subQ.id ? { ...sq, required: e.target.checked } : sq
                                        )
                                      }
                                    })
                                  }}
                                  className="rounded"
                                />
                                <Label className="text-xs">Required</Label>
                              </div>
                            </div>
                          </Card>
                        ))}
                        
                        {(!selectedFieldData.properties?.subQuestions || selectedFieldData.properties.subQuestions.length === 0) && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            No sub-questions yet. Click "Add Sub-Question" to get started.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Conditional Logic */}
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Conditional Logic</Label>
                      <div className="text-xs text-muted-foreground mb-2">
                        Show this question only if another question meets certain conditions
                      </div>
                      <div className="space-y-2">
                        <Select
                          value={selectedFieldData.conditionalLogic?.showIf?.fieldId || '__none__'}
                          onValueChange={(fieldId) => {
                            if (fieldId && fieldId !== '__none__') {
                              updateField(selectedFieldData.id, {
                                conditionalLogic: {
                                  showIf: {
                                    fieldId,
                                    operator: selectedFieldData.conditionalLogic?.showIf?.operator || 'equals',
                                    value: selectedFieldData.conditionalLogic?.showIf?.value || ''
                                  }
                                }
                              })
                            } else {
                              updateField(selectedFieldData.id, { conditionalLogic: undefined })
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select question..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No condition</SelectItem>
                            {fields
                              .filter(f => f.id !== selectedFieldData.id && f.order < selectedFieldData.order)
                              .map(f => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.label || `Question ${f.order + 1}`}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        {selectedFieldData.conditionalLogic?.showIf?.fieldId && (
                          <>
                            <Select
                              value={selectedFieldData.conditionalLogic.showIf.operator}
                              onValueChange={(operator) => {
                                updateField(selectedFieldData.id, {
                                  conditionalLogic: {
                                    showIf: {
                                      ...selectedFieldData.conditionalLogic!.showIf!,
                                      operator: operator as any
                                    }
                                  }
                                })
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="notEquals">Not equals</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                                <SelectItem value="greaterThan">Greater than</SelectItem>
                                <SelectItem value="lessThan">Less than</SelectItem>
                              </SelectContent>
                            </Select>

                            {(() => {
                              const triggerField = fields.find(f => f.id === selectedFieldData.conditionalLogic?.showIf?.fieldId)
                              if (triggerField?.type === 'select' || triggerField?.type === 'radio' || triggerField?.type === 'checkbox') {
                                return (
                                  <Select
                                    value={String(selectedFieldData.conditionalLogic.showIf.value || '')}
                                    onValueChange={(value) => {
                                      updateField(selectedFieldData.id, {
                                        conditionalLogic: {
                                          showIf: {
                                            ...selectedFieldData.conditionalLogic!.showIf!,
                                            value
                                          }
                                        }
                                      })
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select value..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(triggerField.options || []).filter(opt => opt && opt.trim() !== '').map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )
                              }
                              return (
                                <Input
                                  value={String(selectedFieldData.conditionalLogic.showIf.value || '')}
                                  onChange={(e) => {
                                    const value = triggerField?.type === 'number' 
                                      ? parseFloat(e.target.value) || 0
                                      : e.target.value
                                    updateField(selectedFieldData.id, {
                                      conditionalLogic: {
                                        showIf: {
                                          ...selectedFieldData.conditionalLogic!.showIf!,
                                          value
                                        }
                                      }
                                    })
                                  }}
                                  placeholder="Enter value..."
                                  type={triggerField?.type === 'number' ? 'number' : 'text'}
                                />
                              )
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 pb-4 sm:pb-6 mt-2 sm:mt-4 min-h-0">
            <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
              <Card>
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <h2 className="text-2xl font-bold mb-2">{title || 'Form Preview'}</h2>
                  {description && (
                    <p className="text-muted-foreground mb-6">{description}</p>
                  )}
                  
                  <div className="space-y-6">
                    {fields.map((field, index) => (
                      <div key={field.id} className="space-y-2">
                        <Label className="text-lg">
                          {field.label || `Question ${index + 1}`}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {field.helpText && (
                          <p className="text-sm text-muted-foreground">{field.helpText}</p>
                        )}
                        <div className="mt-2">
                          {/* Render preview based on field type */}
                          {field.type === 'text' && (
                            <Input placeholder={field.placeholder || 'Enter your answer'} disabled />
                          )}
                          {field.type === 'longtext' && (
                            <Textarea placeholder={field.placeholder || 'Enter your answer'} rows={4} disabled />
                          )}
                          {field.type === 'email' && (
                            <Input type="email" placeholder={field.placeholder || 'email@example.com'} disabled />
                          )}
                          {field.type === 'number' && (
                            <Input type="number" placeholder={field.placeholder || 'Enter a number'} disabled />
                          )}
                          {field.type === 'date' && (
                            <Input type="date" disabled />
                          )}
                          {field.type === 'select' && (
                            <Select disabled>
                              <SelectTrigger>
                                <SelectValue placeholder={field.placeholder || 'Select an option'} />
                              </SelectTrigger>
                              <SelectContent>
                                {(field.options || []).filter(opt => opt && opt.trim() !== '').map((opt, idx) => (
                                  <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {field.type === 'radio' && (
                            <div className="space-y-2">
                              {(field.options || []).map((opt, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <input type="radio" disabled className="rounded" />
                                  <Label>{opt}</Label>
                                </div>
                              ))}
                            </div>
                          )}
                          {field.type === 'checkbox' && (
                            <div className="space-y-2">
                              {(field.options || []).map((opt, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <input type="checkbox" disabled className="rounded" />
                                  <Label>{opt}</Label>
                                </div>
                              ))}
                            </div>
                          )}
                          {field.type === 'rating' && (
                            <div className="flex gap-2">
                              {Array.from({ length: field.properties?.ratingMax || 5 }).map((_, idx) => (
                                <Star key={idx} className="h-6 w-6 text-muted fill-muted" />
                              ))}
                            </div>
                          )}
                          {field.type === 'scale' && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {field.properties?.min || 1}
                              </span>
                              <div className="flex-1 mx-4">
                                <Input type="range" 
                                  min={field.properties?.min || 1} 
                                  max={field.properties?.max || 10}
                                  disabled
                                  className="w-full"
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {field.properties?.max || 10}
                              </span>
                            </div>
                          )}
                          {field.type === 'file' && (
                            <div className="border-2 border-dashed rounded-lg p-8 text-center">
                              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                            </div>
                          )}
                          {field.type === 'url' && (
                            <Input type="url" placeholder={field.placeholder || 'https://example.com'} disabled />
                          )}
                          {field.type === 'group' && field.properties?.subQuestions && (
                            <div className="space-y-4 mt-4 pl-4 border-l-2 border-muted">
                              {field.properties.subQuestions.map((subQ, subIdx) => (
                                <div key={subQ.id} className="space-y-2">
                                  <Label className="text-base">
                                    {subQ.label || `Sub-question ${subIdx + 1}`}
                                    {subQ.required && <span className="text-red-500 ml-1">*</span>}
                                  </Label>
                                  {subQ.type === 'text' && (
                                    <Input placeholder="Enter your answer" disabled />
                                  )}
                                  {subQ.type === 'textarea' && (
                                    <Textarea placeholder="Enter your answer" rows={3} disabled />
                                  )}
                                  {subQ.type === 'email' && (
                                    <Input type="email" placeholder="email@example.com" disabled />
                                  )}
                                  {subQ.type === 'number' && (
                                    <Input type="number" placeholder="Enter a number" disabled />
                                  )}
                                  {subQ.type === 'date' && (
                                    <Input type="date" disabled />
                                  )}
                                  {subQ.type === 'select' && (
                                    <Select disabled>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an option" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(subQ.options || []).filter(opt => opt && opt.trim() !== '').map((opt, optIdx) => (
                                          <SelectItem key={optIdx} value={opt}>{opt}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  {subQ.type === 'radio' && (
                                    <div className="space-y-2">
                                      {(subQ.options || []).filter(opt => opt && opt.trim() !== '').map((opt, optIdx) => (
                                        <div key={optIdx} className="flex items-center space-x-2">
                                          <input type="radio" disabled className="rounded-full" />
                                          <Label className="font-normal">{opt}</Label>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {subQ.type === 'checkbox' && (
                                    <div className="space-y-2">
                                      {(subQ.options || []).filter(opt => opt && opt.trim() !== '').map((opt, optIdx) => (
                                        <div key={optIdx} className="flex items-center space-x-2">
                                          <input type="checkbox" disabled className="rounded" />
                                          <Label className="font-normal">{opt}</Label>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t">
                    <Button disabled className="w-full">
                      Submit Form
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="theme" className="flex-1 overflow-y-auto px-6 pb-6 mt-4 min-h-0">
            <div className="max-w-3xl mx-auto space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Form Appearance</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Customize the look and feel of your form
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="conversational"
                        checked={theme.conversational}
                        onChange={(e) => setTheme({ ...theme, conversational: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="conversational" className="cursor-pointer">
                        Enable conversational mode (Typeform-style, one question at a time)
                      </Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={theme.primaryColor || '#f97316'}
                            onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            value={theme.primaryColor || '#f97316'}
                            onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                            placeholder="#f97316"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={theme.backgroundColor || '#ffffff'}
                            onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            value={theme.backgroundColor || '#ffffff'}
                            onChange={(e) => setTheme({ ...theme, backgroundColor: e.target.value })}
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={theme.textColor || '#000000'}
                            onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            value={theme.textColor || '#000000'}
                            onChange={(e) => setTheme({ ...theme, textColor: e.target.value })}
                            placeholder="#000000"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Font Family</Label>
                        <Select
                          value={theme.fontFamily || 'inherit'}
                          onValueChange={(value) => setTheme({ ...theme, fontFamily: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">System Default</SelectItem>
                            <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                            <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                            <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                            <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                            <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                            <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Theme Preview */}
                    <div className="mt-6 pt-6 border-t">
                      <Label className="text-sm font-semibold mb-3 block">Preview</Label>
                      <Card 
                        className="p-6"
                        style={{
                          backgroundColor: theme.backgroundColor || '#ffffff',
                          color: theme.textColor || '#000000',
                          fontFamily: theme.fontFamily || 'inherit'
                        }}
                      >
                        <h4 className="text-xl font-bold mb-2">Sample Question</h4>
                        <p className="text-muted-foreground mb-4">This is how your form will look</p>
                        <Input 
                          placeholder="Your answer here..." 
                          className="mb-4"
                          style={{ borderColor: theme.primaryColor || '#f97316' }}
                        />
                        <Button 
                          style={{ backgroundColor: theme.primaryColor || '#f97316' }}
                          className="w-full"
                        >
                          Next
                        </Button>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
