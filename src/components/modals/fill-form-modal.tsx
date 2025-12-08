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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, X, CheckCircle, Upload, Image as ImageIcon, Video, FileText as FileTextIcon } from 'lucide-react'
import { Form, FormField } from '@/lib/supabase'
import { toastSuccess, toastError } from '@/lib/toast'
import { supabase } from '@/lib/supabase'

interface ExtendedFormField extends Omit<FormField, 'type'> {
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 
        'rating' | 'scale' | 'matrix' | 'file' | 'image' | 'video' | 'url' | 'longtext' | 'group'
  properties?: {
    subQuestions?: Array<{
      id: string
      label: string
      type: string
      required: boolean
    }>
  }
}

interface FillFormModalProps {
  isOpen: boolean
  onClose: () => void
  onFormSubmitted: () => void
  form: Form
  spaceId?: string | null
  theme?: {
    primaryColor?: string
    backgroundColor?: string
    textColor?: string
    fontFamily?: string
  }
}

export default function FillFormModal({ isOpen, onClose, onFormSubmitted, form, spaceId, theme }: FillFormModalProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})

  // Parse theme from form description if not provided
  const formTheme = (() => {
    // First try to parse from form description (most reliable)
    let parsedTheme: any = null
    if (form.description) {
      try {
        // Use a more robust regex that handles multiline JSON
        const themeMatch = form.description.match(/__THEME__({[\s\S]*?})__THEME__/)
        if (themeMatch) {
          parsedTheme = JSON.parse(themeMatch[1])
          console.log('Parsed theme from form description:', parsedTheme)
        }
      } catch (e) {
        console.error('Error parsing theme from description:', e)
        // Ignore parse errors
      }
    }
    
    // If theme prop is provided and has valid values, use it (but merge with parsed theme)
    if (theme && theme.primaryColor) {
      parsedTheme = { ...parsedTheme, ...theme }
      console.log('Using theme prop:', theme)
    }
    
    // Ensure all theme properties have defaults
    const finalTheme = {
      primaryColor: parsedTheme?.primaryColor || '#f97316',
      backgroundColor: parsedTheme?.backgroundColor || '#ffffff',
      textColor: parsedTheme?.textColor || '#000000',
      fontFamily: parsedTheme?.fontFamily || 'inherit'
    }
    console.log('Final form theme:', finalTheme)
    return finalTheme
  })()

  // Calculate field background color based on modal background
  const getFieldBackgroundColor = (): string => {
    const bgColor = formTheme.backgroundColor
    
    // Helper to convert hex to RGB
    const hexToRgb = (hex: string): [number, number, number] | null => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ] : null
    }

    // Helper to calculate luminance
    const getLuminance = (r: number, g: number, b: number): number => {
      const [rs, gs, bs] = [r, g, b].map(val => {
        val = val / 255
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
    }

    // Try to parse hex color
    const rgb = hexToRgb(bgColor)
    if (rgb) {
      const [r, g, b] = rgb
      const luminance = getLuminance(r, g, b)
      
      // If dark background (luminance < 0.5), use lighter color
      if (luminance < 0.5) {
        // Increase brightness by ~20-30%
        const lighten = (val: number) => Math.min(255, val + 40)
        return `rgb(${lighten(r)}, ${lighten(g)}, ${lighten(b)})`
      } else {
        // If light background, use darker color
        const darken = (val: number) => Math.max(0, val - 30)
        return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`
      }
    }

    // Fallback: if we can't parse, use defaults based on common colors
    const bgLower = bgColor.toLowerCase()
    if (bgLower.includes('#000') || bgLower.includes('black') || bgLower.includes('#1a')) {
      return '#2a2a2a' // Lighter black for dark backgrounds
    } else if (bgLower.includes('#fff') || bgLower.includes('white')) {
      return '#f5f5f5' // Off-white for light backgrounds
    }
    
    return '#2a2a2a' // Default fallback
  }

  const fieldBackgroundColor = getFieldBackgroundColor()

  // Calculate border color based on background (lighter or darker)
  const getBorderColor = () => {
    const bg = formTheme.backgroundColor
    // Simple check: if background is light, use light border; if dark, use dark border
    const isLight = bg === '#ffffff' || bg === '#fff' || bg.toLowerCase().includes('white') || 
                    (bg.startsWith('#') && parseInt(bg.slice(1, 3), 16) > 200)
    return isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
  }

  // Calculate input border color
  const getInputBorderColor = () => {
    const bg = formTheme.backgroundColor
    const isLight = bg === '#ffffff' || bg === '#fff' || bg.toLowerCase().includes('white') || 
                    (bg.startsWith('#') && parseInt(bg.slice(1, 3), 16) > 200)
    return isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)'
  }

  // Calculate text color that contrasts with the field background
  const getContrastingTextColor = (bgColor: string): string => {
    // Helper to convert hex to RGB
    const hexToRgb = (hex: string): [number, number, number] | null => {
      // Handle rgb() format
      const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (rgbMatch) {
        return [
          parseInt(rgbMatch[1], 10),
          parseInt(rgbMatch[2], 10),
          parseInt(rgbMatch[3], 10)
        ]
      }
      // Handle hex format
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ] : null
    }

    // Helper to calculate luminance
    const getLuminance = (r: number, g: number, b: number): number => {
      const [rs, gs, bs] = [r, g, b].map(val => {
        val = val / 255
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
    }

    // Try to parse the color
    const rgb = hexToRgb(bgColor)
    if (rgb) {
      const [r, g, b] = rgb
      const luminance = getLuminance(r, g, b)
      
      // If background is dark (luminance < 0.5), use light text
      // If background is light (luminance >= 0.5), use dark text
      return luminance < 0.5 ? '#e5e5e5' : '#1a1a1a'
    }

    // Fallback: check for common color patterns
    const bgLower = bgColor.toLowerCase()
    if (bgLower.includes('#000') || bgLower.includes('black') || bgLower.includes('#1a') || bgLower.includes('#2a')) {
      return '#e5e5e5' // Light text for dark backgrounds
    } else if (bgLower.includes('#fff') || bgLower.includes('white') || bgLower.includes('#f5')) {
      return '#1a1a1a' // Dark text for light backgrounds
    }
    
    return formTheme.textColor || '#e5e5e5' // Default fallback
  }

  const selectTextColor = getContrastingTextColor(fieldBackgroundColor)
  
  // Determine if background is light or dark for hover effects
  const isLightBackground = (() => {
    const rgbMatch = fieldBackgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10)
      const g = parseInt(rgbMatch[2], 10)
      const b = parseInt(rgbMatch[3], 10)
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      return luminance >= 0.5
    }
    const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fieldBackgroundColor)
    if (hexMatch) {
      const r = parseInt(hexMatch[1], 16)
      const g = parseInt(hexMatch[2], 16)
      const b = parseInt(hexMatch[3], 16)
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      return luminance >= 0.5
    }
    // Default to dark background
    return false
  })()

  // Reset form data when modal opens
  useEffect(() => {
    if (isOpen && form) {
      const initialData: Record<string, unknown> = {}
      
      // Parse fields if they're stored as JSON string
      let parsedFields = form.fields
      if (typeof form.fields === 'string') {
        try {
          parsedFields = JSON.parse(form.fields)
        } catch (e) {
          console.error('Error parsing form fields:', e)
          parsedFields = form.fields
        }
      }
      
      parsedFields.forEach((field: any) => {
        // Parse properties and validation if they're JSON strings
        let fieldProperties = field.properties
        let validationData = field.validation
        
        if (typeof fieldProperties === 'string') {
          try {
            fieldProperties = JSON.parse(fieldProperties)
          } catch (e) {
            console.error('Error parsing field properties:', e)
            fieldProperties = {}
          }
        }
        if (typeof validationData === 'string') {
          try {
            validationData = JSON.parse(validationData)
          } catch (e) {
            console.error('Error parsing validation data:', e)
            validationData = {}
          }
        }
        
        // Advanced form builder stores properties (including subQuestions) in validation
        const subQuestions = fieldProperties?.subQuestions || validationData?.subQuestions
        
        if (field.type === 'checkbox') {
          initialData[field.id] = false
        } else if (field.type === 'group' && subQuestions) {
          // Initialize sub-questions
          subQuestions.forEach((subQ: any) => {
            if (subQ.type === 'checkbox') {
              initialData[`${field.id}_${subQ.id}`] = []
            } else {
              initialData[`${field.id}_${subQ.id}`] = ''
            }
          })
        } else {
          initialData[field.id] = ''
        }
      })
      setFormData(initialData)
      setSuccess(false) // Reset success state when modal opens
    }
  }, [isOpen, form])

  const updateFieldValue = (fieldId: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const handleFileUpload = async (fieldId: string, file: File, fieldType: 'file' | 'image' | 'video') => {
    if (!supabase || !session?.user?.id) {
      toastError('Unable to upload file. Please try again.')
      return
    }

    setUploadingFiles(prev => ({ ...prev, [fieldId]: true }))

    try {
      // Create a unique file name
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${timestamp}-${sanitizedName}`
      
      // Upload to form-submissions bucket (or documents bucket with form-submissions folder)
      const folderPath = spaceId ? `form-submissions/${spaceId}/${form.id}` : `form-submissions/${form.id}`
      const filePath = `${folderPath}/${fileName}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL for the file
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const fileData = {
        url: urlData.publicUrl,
        path: filePath,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      }

      // Update form data with file information
      updateFieldValue(fieldId, fileData)
      toastSuccess('File uploaded successfully')
    } catch (error) {
      console.error('Error uploading file:', error)
      toastError('Failed to upload file', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fieldId]: false }))
    }
  }

  const validateForm = () => {
    const extendedFields = form.fields as ExtendedFormField[]
    for (const field of extendedFields) {
      if (field.required) {
        // Handle group fields differently - check sub-questions instead
        if (field.type === 'group') {
          // Parse properties and validation to get subQuestions
          let fieldProperties = (field as any).properties
          let validationData = (field as any).validation
          
          if (typeof fieldProperties === 'string') {
            try {
              fieldProperties = JSON.parse(fieldProperties)
            } catch (e) {
              fieldProperties = {}
            }
          }
          if (typeof validationData === 'string') {
            try {
              validationData = JSON.parse(validationData)
            } catch (e) {
              validationData = {}
            }
          }
          
          const subQuestions = validationData?.subQuestions ||
                              fieldProperties?.subQuestions || 
                              (field as any).subQuestions || 
                              []
          
          // Check each required sub-question
          for (const subQ of subQuestions) {
            if (subQ.required) {
              const subValue = formData[`${field.id}_${subQ.id}`]
              if (subValue === '' || subValue === null || subValue === undefined || 
                  (Array.isArray(subValue) && subValue.length === 0)) {
                return `Field "${subQ.label}" is required`
              }
            }
          }
        } else {
          // Regular field validation
          const value = formData[field.id]
          // For file/image/video fields, check if it's an object with a url property
          if (field.type === 'file' || field.type === 'image' || field.type === 'video') {
            if (!value || (typeof value === 'object' && !('url' in value))) {
              return `Field "${field.label}" is required`
            }
          } else if (value === '' || value === null || value === undefined || 
              (Array.isArray(value) && value.length === 0)) {
            return `Field "${field.label}" is required`
          }
        }
      }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      toastError(validationError)
      return
    }

    if (!session?.user?.id) {
      toastError('You must be logged in to submit a form')
      return
    }

    setLoading(true)

    try {
      console.log('Submitting form with data:', formData)
      const result = await submitForm(form.id, formData, session.user.id, spaceId)
      console.log('Submit form result:', result)
      
      if (result.success && result.data) {
        setSuccess(true)
        toastSuccess('Form submitted successfully!')
        setTimeout(() => {
          onFormSubmitted()
          onClose()
          setSuccess(false) // Reset success state when closing
        }, 1500)
      } else {
        console.error('Form submission failed:', result.error)
        toastError(result.error || 'Failed to submit form. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting form (catch):', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      toastError('An error occurred while submitting the form', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  const renderField = (field: ExtendedFormField) => {
    const value = formData[field.id]
    const isRequired = field.required

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-base font-semibold block" style={{ color: formTheme.textColor }}>
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.helpText && (
                <p className="text-sm" style={{ color: formTheme.textColor + 'aa' }}>
                  {field.helpText}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              type={field.type}
              value={String(value || '')}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder || 'Enter your answer'}
              required={isRequired}
              disabled={loading}
              className="rounded-md"
              style={{ 
                backgroundColor: fieldBackgroundColor,
                borderColor: value === '' && isRequired ? formTheme.primaryColor : getInputBorderColor(),
                fontFamily: formTheme.fontFamily,
                color: formTheme.textColor,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            />
          </div>
        )

      case 'textarea':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-base font-semibold block" style={{ color: formTheme.textColor }}>
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.helpText && (
                <p className="text-sm" style={{ color: formTheme.textColor + 'aa' }}>
                  {field.helpText}
                </p>
              )}
            </div>
            <Textarea
              id={field.id}
              value={String(value || '')}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder || 'Enter your answer'}
              required={isRequired}
              disabled={loading}
              rows={4}
              className="rounded-md"
              style={{ 
                backgroundColor: fieldBackgroundColor,
                borderColor: value === '' && isRequired ? formTheme.primaryColor : getInputBorderColor(),
                fontFamily: formTheme.fontFamily,
                color: formTheme.textColor,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            />
          </div>
        )

      case 'select':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-base font-semibold block" style={{ color: formTheme.textColor }}>
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.helpText && (
                <p className="text-sm" style={{ color: formTheme.textColor + 'aa' }}>
                  {field.helpText}
                </p>
              )}
            </div>
            <Select
              value={String(value || '')}
              onValueChange={(val) => updateFieldValue(field.id, val)}
              disabled={loading}
            >
              <SelectTrigger 
                className="rounded-md"
                style={{ 
                  backgroundColor: fieldBackgroundColor, 
                  color: formTheme.textColor,
                  borderColor: getInputBorderColor(),
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: fieldBackgroundColor, color: selectTextColor, borderColor: getInputBorderColor() }}>
                {field.options?.map((option, index) => (
                  <SelectItem 
                    key={index} 
                    value={option} 
                    style={{ 
                      color: selectTextColor,
                      backgroundColor: 'transparent'
                    }}
                    className={isLightBackground 
                      ? "hover:bg-black/10 focus:bg-black/20 focus:text-current" 
                      : "hover:bg-white/10 focus:bg-white/20 focus:text-current"
                    }
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-base font-semibold block" style={{ color: formTheme.textColor }}>
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.helpText && (
                <p className="text-sm" style={{ color: formTheme.textColor + 'aa' }}>
                  {field.helpText}
                </p>
              )}
            </div>
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
                    className="accent-[#f97316]"
                    style={{ accentColor: formTheme.primaryColor }}
                  />
                  <Label htmlFor={`${field.id}-${index}`} className="text-sm" style={{ color: formTheme.textColor }}>
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 'checkbox':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={field.id}
                  checked={Boolean(value)}
                  onChange={(e) => updateFieldValue(field.id, e.target.checked)}
                  disabled={loading}
                  required={isRequired}
                  className="accent-[#f97316]"
                  style={{ accentColor: formTheme.primaryColor }}
                />
                <Label htmlFor={field.id} className="text-base font-semibold" style={{ color: formTheme.textColor }}>
                  {field.label}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </Label>
              </div>
              {field.helpText && (
                <p className="text-sm ml-6" style={{ color: formTheme.textColor + 'aa' }}>
                  {field.helpText}
                </p>
              )}
            </div>
          </div>
        )

      case 'date':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-base font-semibold block" style={{ color: formTheme.textColor }}>
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.helpText && (
                <p className="text-sm" style={{ color: formTheme.textColor + 'aa' }}>
                  {field.helpText}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              type="date"
              value={String(value || '')}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              required={isRequired}
              disabled={loading}
              className="border border-gray-600 text-[#e5e5e5] focus:border-gray-500 rounded-md"
              style={{ 
                backgroundColor: fieldBackgroundColor,
                borderColor: value === '' && isRequired ? formTheme.primaryColor : undefined,
                fontFamily: formTheme.fontFamily,
                color: formTheme.textColor
              }}
            />
          </div>
        )

      case 'group':
        // Handle properties that might be stored in validation (from advanced-form-builder) or properties
        let fieldProperties = (field as any).properties
        let validationData = (field as any).validation
        
        // Parse if stored as JSON strings
        if (typeof fieldProperties === 'string') {
          try {
            fieldProperties = JSON.parse(fieldProperties)
          } catch (e) {
            console.error('Error parsing field properties:', e)
            fieldProperties = {}
          }
        }
        if (typeof validationData === 'string') {
          try {
            validationData = JSON.parse(validationData)
          } catch (e) {
            console.error('Error parsing validation data:', e)
            validationData = {}
          }
        }
        
        // Check multiple possible locations for subQuestions
        // Advanced form builder stores properties (including subQuestions) in validation object
        const subQuestions = validationData?.subQuestions ||
                            fieldProperties?.subQuestions || 
                            (field as any).subQuestions || 
                            []
        
        console.log('Group field:', {
          id: field.id,
          label: field.label,
          subQuestions,
          properties: fieldProperties,
          validation: validationData,
          rawField: field
        })
        
        if (!subQuestions || subQuestions.length === 0) {
          return (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-base font-semibold block" style={{ color: formTheme.textColor }}>
                  {field.label}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.helpText && (
                  <p className="text-sm" style={{ color: formTheme.textColor + 'aa' }}>
                    {field.helpText}
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground" style={{ color: formTheme.textColor + 'aa' }}>
                No sub-questions configured for this group.
              </p>
            </div>
          )
        }
        
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <Label className="text-base font-semibold block" style={{ color: formTheme.textColor }}>
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.helpText && (
                <p className="text-sm" style={{ color: formTheme.textColor + 'aa' }}>
                  {field.helpText}
                </p>
              )}
            </div>
            <div className="space-y-6 pl-4 border-l-2" style={{ borderColor: getInputBorderColor() }}>
              {subQuestions.map((subQ: any) => {
                const subValue = formData[`${field.id}_${subQ.id}`]
                const subRequired = subQ.required
                return (
                  <div key={subQ.id} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`${field.id}_${subQ.id}`} className="text-base font-semibold block" style={{ color: formTheme.textColor }}>
                        {subQ.label}
                        {subRequired && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {subQ.helpText && (
                        <p className="text-sm" style={{ color: formTheme.textColor + 'aa' }}>
                          {subQ.helpText}
                        </p>
                      )}
                    </div>
                    {subQ.type === 'text' && (
                      <Input
                        id={`${field.id}_${subQ.id}`}
                        value={String(subValue || '')}
                        onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                        placeholder={subQ.placeholder || 'Enter your answer'}
                        required={subRequired}
                        disabled={loading}
                        className="rounded-md"
                        style={{ 
                          backgroundColor: fieldBackgroundColor,
                          borderColor: subValue === '' && subRequired ? formTheme.primaryColor : undefined,
                          fontFamily: formTheme.fontFamily,
                          color: formTheme.textColor
                        }}
                      />
                    )}
                    {subQ.type === 'textarea' && (
                      <Textarea
                        id={`${field.id}_${subQ.id}`}
                        value={String(subValue || '')}
                        onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                        placeholder={subQ.placeholder || 'Enter your answer'}
                        required={subRequired}
                        disabled={loading}
                        rows={4}
                        className="rounded-md"
                        style={{ 
                          backgroundColor: fieldBackgroundColor,
                          borderColor: subValue === '' && subRequired ? formTheme.primaryColor : undefined,
                          fontFamily: formTheme.fontFamily,
                          color: formTheme.textColor
                        }}
                      />
                    )}
                    {subQ.type === 'email' && (
                      <Input
                        id={`${field.id}_${subQ.id}`}
                        type="email"
                        value={String(subValue || '')}
                        onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                        placeholder={subQ.placeholder || 'Enter your answer'}
                        required={subRequired}
                        disabled={loading}
                        className="rounded-md"
                        style={{ 
                          backgroundColor: fieldBackgroundColor,
                          borderColor: subValue === '' && subRequired ? formTheme.primaryColor : undefined,
                          fontFamily: formTheme.fontFamily,
                          color: formTheme.textColor
                        }}
                      />
                    )}
                    {subQ.type === 'number' && (
                      <Input
                        id={`${field.id}_${subQ.id}`}
                        type="number"
                        value={String(subValue || '')}
                        onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                        placeholder={subQ.placeholder || 'Enter your answer'}
                        required={subRequired}
                        disabled={loading}
                        className="rounded-md"
                        style={{ 
                          backgroundColor: fieldBackgroundColor,
                          borderColor: subValue === '' && subRequired ? formTheme.primaryColor : undefined,
                          fontFamily: formTheme.fontFamily,
                          color: formTheme.textColor
                        }}
                      />
                    )}
                    {subQ.type === 'date' && (
                      <Input
                        id={`${field.id}_${subQ.id}`}
                        type="date"
                        value={String(subValue || '')}
                        onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                        required={subRequired}
                        disabled={loading}
                        className="rounded-md"
                        style={{ 
                          backgroundColor: fieldBackgroundColor,
                          borderColor: subValue === '' && subRequired ? formTheme.primaryColor : getInputBorderColor(),
                          fontFamily: formTheme.fontFamily,
                          color: formTheme.textColor,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      />
                    )}
                    {subQ.type === 'select' && (
                      <Select
                        value={String(subValue || '')}
                        onValueChange={(val) => updateFieldValue(`${field.id}_${subQ.id}`, val)}
                        disabled={loading}
                      >
                        <SelectTrigger 
                          className="rounded-md"
                          style={{ 
                            backgroundColor: fieldBackgroundColor, 
                            color: formTheme.textColor,
                            borderColor: getInputBorderColor(),
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                        >
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent style={{ backgroundColor: fieldBackgroundColor, color: selectTextColor, borderColor: getInputBorderColor() }}>
                          {subQ.options?.map((option: string, optIdx: number) => (
                            <SelectItem 
                              key={optIdx} 
                              value={option} 
                              style={{ 
                                color: selectTextColor,
                                backgroundColor: 'transparent'
                              }}
                              className={isLightBackground 
                                ? "hover:bg-black/10 focus:bg-black/20 focus:text-current" 
                                : "hover:bg-white/10 focus:bg-white/20 focus:text-current"
                              }
                            >
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {subQ.type === 'radio' && (
                      <div className="space-y-2">
                        {subQ.options?.map((option: string, optIdx: number) => (
                          <div key={optIdx} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={`${field.id}_${subQ.id}-${optIdx}`}
                              name={`${field.id}_${subQ.id}`}
                              value={option}
                              checked={subValue === option}
                              onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                              disabled={loading}
                              required={subRequired}
                              className="accent-[#f97316]"
                              style={{ accentColor: formTheme.primaryColor }}
                            />
                            <Label htmlFor={`${field.id}_${subQ.id}-${optIdx}`} className="text-sm" style={{ color: formTheme.textColor }}>
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    {subQ.type === 'checkbox' && (
                      <div className="space-y-2">
                        {subQ.options?.map((option: string, optIdx: number) => {
                          const checked = Array.isArray(subValue) 
                            ? subValue.includes(option)
                            : false
                          return (
                            <div key={optIdx} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`${field.id}_${subQ.id}-${optIdx}`}
                                checked={checked}
                                onChange={(e) => {
                                  const currentValues = Array.isArray(subValue) ? subValue : []
                                  const newValues = e.target.checked
                                    ? [...currentValues, option]
                                    : currentValues.filter(v => v !== option)
                                  updateFieldValue(`${field.id}_${subQ.id}`, newValues)
                                }}
                                disabled={loading}
                                className="accent-[#f97316]"
                                style={{ accentColor: formTheme.primaryColor }}
                              />
                              <Label htmlFor={`${field.id}_${subQ.id}-${optIdx}`} className="text-sm" style={{ color: formTheme.textColor }}>
                                {option}
                              </Label>
                            </div>
                          )
                        })}
                      </div>
                    )}
                </div>
              )
            })}
            </div>
          </div>
        )

      case 'file':
      case 'image':
      case 'video':
        const fileValue = value as { url?: string; name?: string; type?: string } | null
        const isUploading = uploadingFiles[field.id]
        const acceptedTypes = field.type === 'image' 
          ? 'image/*' 
          : field.type === 'video' 
          ? 'video/*' 
          : '*/*'
        
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-base font-semibold block" style={{ color: formTheme.textColor }}>
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.helpText && (
                <p className="text-sm" style={{ color: formTheme.textColor + 'aa' }}>
                  {field.helpText}
                </p>
              )}
            </div>
            {fileValue?.url ? (
              <div className="border rounded-md p-4" style={{ backgroundColor: fieldBackgroundColor, borderColor: getInputBorderColor() }}>
                <div className="flex items-start gap-3">
                  {field.type === 'image' && fileValue.url ? (
                    <div className="flex-1">
                      <img 
                        src={fileValue.url} 
                        alt={fileValue.name || 'Uploaded image'} 
                        className="w-full max-h-64 rounded-md object-contain mb-2"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <p className="text-sm font-medium truncate" style={{ color: formTheme.textColor }}>
                            {fileValue.name || 'Uploaded image'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateFieldValue(field.id, '')}
                          disabled={loading || isUploading}
                          className="ml-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {field.type === 'video' && <Video className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                        {field.type === 'file' && <FileTextIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: formTheme.textColor }}>
                            {fileValue.name || 'Uploaded file'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateFieldValue(field.id, '')}
                        disabled={loading || isUploading}
                        className="ml-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full">
                <label
                  htmlFor={`file-${field.id}`}
                  className="block w-full cursor-pointer"
                >
                  <input
                    id={`file-${field.id}`}
                    type="file"
                    accept={acceptedTypes}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file && (field.type === 'file' || field.type === 'image' || field.type === 'video')) {
                        handleFileUpload(field.id, file, field.type as 'file' | 'image' | 'video')
                      }
                    }}
                    disabled={loading || isUploading}
                    className="hidden"
                  />
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center transition-all hover:bg-opacity-50"
                    style={{ 
                      borderColor: (value === '' || value === null || value === undefined) && isRequired 
                        ? formTheme.primaryColor 
                        : 'rgba(156, 163, 175, 0.4)',
                      backgroundColor: fieldBackgroundColor
                    }}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-10 w-10 mb-3 animate-spin" style={{ color: formTheme.primaryColor }} />
                        <p className="text-sm font-medium" style={{ color: formTheme.textColor }}>
                          Uploading...
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="h-10 w-10 mb-3" style={{ color: formTheme.textColor + 'cc' }} />
                        <p className="text-sm font-medium mb-1" style={{ color: formTheme.textColor }}>
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs mt-1" style={{ color: formTheme.textColor + '88' }}>
                          {field.type === 'image' && 'PNG, JPG, GIF up to 10MB'}
                          {field.type === 'video' && 'MP4, MOV, AVI up to 100MB'}
                          {field.type === 'file' && 'Any file type up to 50MB'}
                        </p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={field.id} className="text-base font-semibold block" style={{ color: formTheme.textColor }}>
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {field.helpText && (
                <p className="text-sm" style={{ color: formTheme.textColor + 'aa' }}>
                  {field.helpText}
                </p>
              )}
            </div>
            <Input
              id={field.id}
              value={String(value || '')}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={field.placeholder || 'Enter your answer'}
              required={isRequired}
              disabled={loading}
              className="rounded-md"
              style={{ 
                backgroundColor: fieldBackgroundColor,
                borderColor: value === '' && isRequired ? formTheme.primaryColor : undefined,
                fontFamily: formTheme.fontFamily,
                color: formTheme.textColor
              }}
            />
          </div>
        )
    }
  }

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px]"
        style={{
          backgroundColor: formTheme.backgroundColor,
          color: formTheme.textColor,
          fontFamily: formTheme.fontFamily
        }}
      >
          <DialogHeader>
            <DialogTitle className="flex items-center" style={{ color: formTheme.textColor }}>
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
              Form Submitted Successfully!
            </DialogTitle>
            <DialogDescription style={{ color: formTheme.textColor + 'aa' }}>
              Thank you for your submission. Your response has been recorded.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <p style={{ color: formTheme.textColor + 'aa' }}>
              You will be redirected back to the forms list shortly...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Extract description without theme JSON
  const extractDescription = (desc?: string): string => {
    if (!desc) return ''
    return desc.replace(/__THEME__{.*?}__THEME__/g, '').trim()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] p-0 border-0 overflow-hidden"
        style={{
          backgroundColor: formTheme.backgroundColor,
          color: formTheme.textColor
        }}
      >
        <div 
          className="flex flex-col h-full max-h-[90vh] rounded-xl"
          style={{
            backgroundColor: formTheme.backgroundColor,
            color: formTheme.textColor,
            fontFamily: formTheme.fontFamily
          }}
        >
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
          {/* Header - Fixed */}
          <div className="p-6 sm:p-8 pb-4 flex-shrink-0">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold mb-2" style={{ color: formTheme.textColor }}>
                {form.title}
              </DialogTitle>
              {extractDescription(form.description) && (
                <DialogDescription className="text-base" style={{ color: formTheme.textColor + 'aa' }}>
                  {extractDescription(form.description)}
                </DialogDescription>
              )}
            </DialogHeader>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8">
            <div className="space-y-8 pb-4">
              {/* Form Fields */}
              {form.fields.map((field) => (
                <div key={field.id}>
                  {renderField(field as ExtendedFormField)}
                </div>
              ))}
            </div>
          </div>

          {/* Footer - Fixed */}
          <div 
            className="p-6 sm:p-8 pt-4 border-t flex-shrink-0"
            style={{ borderColor: getBorderColor() }}
          >
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                style={{
                  backgroundColor: 'transparent',
                  borderColor: getBorderColor(),
                  color: formTheme.textColor
                }}
                className="hover:opacity-70"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                style={{ backgroundColor: formTheme.primaryColor }}
                className="text-white hover:opacity-90"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Form'
                )}
              </Button>
            </div>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 