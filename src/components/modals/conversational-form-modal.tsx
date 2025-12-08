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
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, Star, Heart, ThumbsUp } from 'lucide-react'
import { Form, FormField } from '@/lib/supabase'
import { toastSuccess, toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface ConversationalFormModalProps {
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

interface SubQuestion {
  id: string
  label: string
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'date'
  required: boolean
  placeholder?: string
  options?: string[]
  order: number
}

interface ExtendedFormField extends Omit<FormField, 'type'> {
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
    ratingMax?: number
    ratingIcon?: 'star' | 'heart' | 'thumb'
    min?: number
    max?: number
    subQuestions?: SubQuestion[]
  }
  helpText?: string
}

export default function ConversationalFormModal({ 
  isOpen, 
  onClose, 
  onFormSubmitted, 
  form,
  spaceId,
  theme 
}: ConversationalFormModalProps) {
  const { data: session } = useSession()
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [visibleFields, setVisibleFields] = useState<ExtendedFormField[]>([])

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

  // Initialize form and calculate visible fields based on conditional logic
  useEffect(() => {
    if (isOpen && form) {
      const initialData: Record<string, unknown> = {}
      const extendedFields = form.fields as ExtendedFormField[]
      
      extendedFields.forEach(field => {
        if (field.type === 'checkbox') {
          initialData[field.id] = false
        } else if (field.type === 'group' && field.properties?.subQuestions) {
          // Initialize sub-questions
          field.properties.subQuestions.forEach(subQ => {
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
      setCurrentIndex(0)
      setSuccess(false)
      calculateVisibleFields(extendedFields, initialData)
    }
  }, [isOpen, form])

  // Recalculate visible fields when form data changes
  useEffect(() => {
    if (form && Object.keys(formData).length > 0) {
      const extendedFields = form.fields as ExtendedFormField[]
      calculateVisibleFields(extendedFields, formData)
    }
  }, [formData, form])

  const calculateVisibleFields = (fields: ExtendedFormField[], data: Record<string, unknown>) => {
    const visible: ExtendedFormField[] = []
    
    for (const field of fields) {
      const conditionalLogic = (field as ExtendedFormField).conditionalLogic
      
      if (!conditionalLogic?.showIf) {
        visible.push(field)
        continue
      }

      const triggerFieldId = conditionalLogic.showIf.fieldId
      const triggerValue = data[triggerFieldId]
      const conditionValue = conditionalLogic.showIf.value
      const operator = conditionalLogic.showIf.operator

      let shouldShow = false

      switch (operator) {
        case 'equals':
          shouldShow = String(triggerValue) === String(conditionValue)
          break
        case 'notEquals':
          shouldShow = String(triggerValue) !== String(conditionValue)
          break
        case 'contains':
          shouldShow = String(triggerValue).includes(String(conditionValue))
          break
        case 'greaterThan':
          shouldShow = Number(triggerValue) > Number(conditionValue)
          break
        case 'lessThan':
          shouldShow = Number(triggerValue) < Number(conditionValue)
          break
      }

      if (shouldShow) {
        visible.push(field)
      }
    }

    setVisibleFields(visible)
    
    // Adjust current index if it's out of bounds
    if (currentIndex >= visible.length && visible.length > 0) {
      setCurrentIndex(visible.length - 1)
    } else if (visible.length === 0) {
      setCurrentIndex(0)
    }
  }

  const updateFieldValue = (fieldId: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))
  }

  const currentField = visibleFields[currentIndex]
  const isFirstQuestion = currentIndex === 0
  const isLastQuestion = currentIndex === visibleFields.length - 1
  const progress = visibleFields.length > 0 ? ((currentIndex + 1) / visibleFields.length) * 100 : 0

  const handleNext = () => {
    if (currentField?.required) {
      // Handle group fields with sub-questions
      if (currentField.type === 'group' && currentField.properties?.subQuestions) {
        const subQuestions = currentField.properties.subQuestions
        for (const subQ of subQuestions) {
          if (subQ.required) {
            const subValue = formData[`${currentField.id}_${subQ.id}`]
            if (subQ.type === 'checkbox') {
              // For checkboxes, check if array is empty
              if (!Array.isArray(subValue) || subValue.length === 0) {
                toastError(`Please answer "${subQ.label}" before continuing`)
                return
              }
            } else {
              // For other types, check if value is empty
              if (subValue === '' || subValue === null || subValue === undefined) {
                toastError(`Please answer "${subQ.label}" before continuing`)
                return
              }
            }
          }
        }
      } else {
        // Handle regular fields
        const value = formData[currentField.id]
        if (value === '' || value === null || value === undefined) {
          toastError(`Please answer this question before continuing`)
          return
        }
      }
    }

    if (!isLastQuestion) {
      setCurrentIndex(prev => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    // Validate all required fields
    for (const field of visibleFields) {
      if (field.required) {
        // Handle group fields with sub-questions
        if (field.type === 'group' && field.properties?.subQuestions) {
          const subQuestions = field.properties.subQuestions
          for (const subQ of subQuestions) {
            if (subQ.required) {
              const subValue = formData[`${field.id}_${subQ.id}`]
              if (subQ.type === 'checkbox') {
                // For checkboxes, check if array is empty
                if (!Array.isArray(subValue) || subValue.length === 0) {
                  toastError(`Field "${subQ.label}" is required`)
                  setCurrentIndex(visibleFields.findIndex(f => f.id === field.id))
                  return
                }
              } else {
                // For other types, check if value is empty
                if (subValue === '' || subValue === null || subValue === undefined) {
                  toastError(`Field "${subQ.label}" is required`)
                  setCurrentIndex(visibleFields.findIndex(f => f.id === field.id))
                  return
                }
              }
            }
          }
        } else {
          // Handle regular fields
          const value = formData[field.id]
          if (value === '' || value === null || value === undefined) {
            toastError(`Field "${field.label}" is required`)
            setCurrentIndex(visibleFields.findIndex(f => f.id === field.id))
            return
          }
        }
      }
    }

    if (!session?.user?.id) {
      toastError('You must be logged in to submit a form')
      return
    }

    setLoading(true)

    try {
      const result = await submitForm(form.id, formData, session.user.id, spaceId)
      
      if (result.success && result.data) {
        setSuccess(true)
        toastSuccess('Form submitted successfully!')
        setTimeout(() => {
          onFormSubmitted()
          onClose()
          setSuccess(false)
        }, 2000)
      } else {
        toastError(result.error || 'Failed to submit form. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toastError('An error occurred while submitting the form')
    } finally {
      setLoading(false)
    }
  }

  const renderField = (field: ExtendedFormField) => {
    const value = formData[field.id]

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <Input
            id={field.id}
            type={field.type}
            value={String(value || '')}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="text-lg py-6"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLastQuestion) {
                handleNext()
              }
            }}
          />
        )

      case 'textarea':
      case 'longtext':
        return (
          <Textarea
            id={field.id}
            value={String(value || '')}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={6}
            className="text-lg"
            autoFocus
          />
        )

      case 'select':
        return (
          <Select
            value={String(value || '')}
            onValueChange={(val) => updateFieldValue(field.id, val)}
          >
            <SelectTrigger className="text-lg py-6">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, index) => (
                <SelectItem key={index} value={option} className="text-lg py-3">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'radio':
        return (
          <div className="space-y-3">
            {field.options?.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() => updateFieldValue(field.id, option)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-all text-lg",
                  value === option 
                    ? "border-primary bg-primary/5" 
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        )

      case 'checkbox':
        return (
          <div className="space-y-3">
            {field.options?.map((option, index) => {
              const checked = Array.isArray(value) 
                ? value.includes(option)
                : false
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const currentValues = Array.isArray(value) ? value : []
                    const newValues = checked
                      ? currentValues.filter(v => v !== option)
                      : [...currentValues, option]
                    updateFieldValue(field.id, newValues)
                  }}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all text-lg flex items-center gap-3",
                    checked 
                      ? "border-primary bg-primary/5" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center",
                    checked ? "border-primary bg-primary" : "border-gray-300"
                  )}>
                    {checked && <CheckCircle className="h-4 w-4 text-white" />}
                  </div>
                  {option}
                </button>
              )
            })}
          </div>
        )

      case 'date':
        return (
          <Input
            id={field.id}
            type="date"
            value={String(value || '')}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            className="text-lg py-6"
            autoFocus
          />
        )

      case 'rating':
        const maxRating = field.properties?.ratingMax || 5
        const iconType = field.properties?.ratingIcon || 'star'
        
        return (
          <div className="flex justify-center gap-2 py-4">
            {Array.from({ length: maxRating }).map((_, idx) => {
              const rating = idx + 1
              const isSelected = Number(value) >= rating
              
              const IconComponent = iconType === 'heart' ? Heart : 
                                   iconType === 'thumb' ? ThumbsUp : Star
              
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => updateFieldValue(field.id, rating)}
                  className={cn(
                    "transition-transform hover:scale-110",
                    isSelected && "scale-110"
                  )}
                >
                  <IconComponent
                    className={cn(
                      "h-12 w-12 transition-colors",
                      isSelected 
                        ? iconType === 'heart' ? "text-red-500 fill-red-500" :
                          iconType === 'thumb' ? "text-blue-500 fill-blue-500" :
                          "text-yellow-500 fill-yellow-500"
                        : "text-gray-300"
                    )}
                  />
                </button>
              )
            })}
          </div>
        )

      case 'scale':
        const min = field.properties?.min || 1
        const max = field.properties?.max || 10
        
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{min}</span>
              <span className="text-lg font-semibold">{Number(value) || min}</span>
              <span>{max}</span>
            </div>
            <Input
              type="range"
              min={min}
              max={max}
              value={Number(value) || min}
              onChange={(e) => updateFieldValue(field.id, parseInt(e.target.value))}
              className="w-full h-3"
            />
          </div>
        )

      case 'group':
        const subQuestions = field.properties?.subQuestions || []
        return (
          <div className="space-y-6">
            {subQuestions.map((subQ, idx) => {
              const subValue = formData[`${field.id}_${subQ.id}`]
              return (
                <div key={subQ.id} className="space-y-2">
                  <Label className="text-base font-medium">
                    {subQ.label}
                    {subQ.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {subQ.type === 'text' && (
                    <Input
                      id={`${field.id}_${subQ.id}`}
                      value={String(subValue || '')}
                      onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                      placeholder={subQ.placeholder}
                      className="text-lg py-6"
                      autoFocus={idx === 0}
                    />
                  )}
                  {subQ.type === 'textarea' && (
                    <Textarea
                      id={`${field.id}_${subQ.id}`}
                      value={String(subValue || '')}
                      onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                      placeholder={subQ.placeholder}
                      rows={4}
                      className="text-lg"
                      autoFocus={idx === 0}
                    />
                  )}
                  {subQ.type === 'email' && (
                    <Input
                      id={`${field.id}_${subQ.id}`}
                      type="email"
                      value={String(subValue || '')}
                      onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                      placeholder={subQ.placeholder}
                      className="text-lg py-6"
                      autoFocus={idx === 0}
                    />
                  )}
                  {subQ.type === 'number' && (
                    <Input
                      id={`${field.id}_${subQ.id}`}
                      type="number"
                      value={String(subValue || '')}
                      onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                      placeholder={subQ.placeholder}
                      className="text-lg py-6"
                      autoFocus={idx === 0}
                    />
                  )}
                  {subQ.type === 'date' && (
                    <Input
                      id={`${field.id}_${subQ.id}`}
                      type="date"
                      value={String(subValue || '')}
                      onChange={(e) => updateFieldValue(`${field.id}_${subQ.id}`, e.target.value)}
                      className="text-lg py-6"
                      autoFocus={idx === 0}
                    />
                  )}
                  {subQ.type === 'select' && (
                    <Select
                      value={String(subValue || '')}
                      onValueChange={(val) => updateFieldValue(`${field.id}_${subQ.id}`, val)}
                    >
                      <SelectTrigger className="text-lg py-6">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {subQ.options?.map((option, optIdx) => (
                          <SelectItem key={optIdx} value={option} className="text-lg py-3">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {subQ.type === 'radio' && (
                    <div className="space-y-3">
                      {subQ.options?.map((option, optIdx) => (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => updateFieldValue(`${field.id}_${subQ.id}`, option)}
                          className={cn(
                            "w-full text-left p-4 rounded-lg border-2 transition-all text-lg",
                            subValue === option 
                              ? "border-primary bg-primary/5" 
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                  {subQ.type === 'checkbox' && (
                    <div className="space-y-3">
                      {subQ.options?.map((option, optIdx) => {
                        const checked = Array.isArray(subValue) 
                          ? subValue.includes(option)
                          : false
                        
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              const currentValues = Array.isArray(subValue) ? subValue : []
                              const newValues = checked
                                ? currentValues.filter(v => v !== option)
                                : [...currentValues, option]
                              updateFieldValue(`${field.id}_${subQ.id}`, newValues)
                            }}
                            className={cn(
                              "w-full text-left p-4 rounded-lg border-2 transition-all text-lg flex items-center gap-3",
                              checked 
                                ? "border-primary bg-primary/5" 
                                : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <div className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center",
                              checked ? "border-primary bg-primary" : "border-gray-300"
                            )}>
                              {checked && <CheckCircle className="h-4 w-4 text-white" />}
                            </div>
                            {option}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )

      default:
        return (
          <Input
            id={field.id}
            value={String(value || '')}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="text-lg py-6"
            autoFocus
          />
        )
    }
  }

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[600px] p-0 border-0">
          <div className="flex flex-col items-center justify-center min-h-[500px] p-12 text-center">
            <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
            <h2 className="text-3xl font-bold mb-2">Thank you!</h2>
            <p className="text-lg text-muted-foreground">
              Your response has been recorded successfully.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!currentField || visibleFields.length === 0) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 border-0 overflow-hidden" style={{
        backgroundColor: formTheme.backgroundColor,
        color: formTheme.textColor,
        fontFamily: formTheme.fontFamily
      }}>
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div 
            className="h-full transition-all duration-300"
            style={{ 
              width: `${progress}%`,
              backgroundColor: formTheme.primaryColor
            }}
          />
        </div>

        <div className="p-12 min-h-[500px] flex flex-col">
          {/* Question Counter */}
          <div className="text-sm text-muted-foreground mb-6">
            Question {currentIndex + 1} of {visibleFields.length}
          </div>

          {/* Question */}
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-bold mb-4">
              {currentField.label}
              {currentField.required && <span className="text-red-500 ml-1">*</span>}
            </h2>
            
            {currentField.helpText && (
              <p className="text-lg text-muted-foreground mb-8">{currentField.helpText}</p>
            )}

            <div className="mt-8">
              {renderField(currentField)}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-8 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstQuestion || loading}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2"
              style={{ backgroundColor: formTheme.primaryColor }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : isLastQuestion ? (
                <>
                  Submit
                  <CheckCircle className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
