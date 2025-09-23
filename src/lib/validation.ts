// Validation utilities for form handling
export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: unknown) => string | null
  message?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export interface FieldValidation {
  value: unknown
  rules: ValidationRule[]
  touched?: boolean
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    required: true,
    message
  }),
  
  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || `Must be at least ${min} characters`
  }),
  
  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || `Must be no more than ${max} characters`
  }),
  
  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message
  }),
  
  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    pattern: /^https?:\/\/.+/,
    message
  }),
  
  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message
  }),
  
  positiveNumber: (message = 'Must be a positive number'): ValidationRule => ({
    custom: (value) => {
      const num = Number(value)
      return isNaN(num) || num <= 0 ? message : null
    }
  }),
  
  futureDate: (message = 'Date must be in the future'): ValidationRule => ({
    custom: (value) => {
      if (!value) return null
      const date = new Date(String(value))
      const now = new Date()
      return date <= now ? message : null
    }
  }),
  
  pastDate: (message = 'Date must be in the past'): ValidationRule => ({
    custom: (value) => {
      if (!value) return null
      const date = new Date(String(value))
      const now = new Date()
      return date >= now ? message : null
    }
  })
}

// Validate a single field
export function validateField(value: unknown, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return rule.message || 'This field is required'
    }
    
    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      continue
    }
    
    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message || `Must be at least ${rule.minLength} characters`
    }
    
    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message || `Must be no more than ${rule.maxLength} characters`
    }
    
    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || 'Invalid format'
    }
    
    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value)
      if (customError) {
        return customError
      }
    }
  }
  
  return null
}

// Validate multiple fields
export function validateFields(fields: Record<string, FieldValidation>): ValidationResult {
  const errors: Record<string, string> = {}
  let isValid = true
  
  for (const [fieldName, fieldValidation] of Object.entries(fields)) {
    const error = validateField(fieldValidation.value, fieldValidation.rules)
    if (error) {
      errors[fieldName] = error
      isValid = false
    }
  }
  
  return { isValid, errors }
}

// Form-specific validation schemas
export const formSchemas = {
  project: {
    name: [
      validationRules.required('Project name is required'),
      validationRules.minLength(2, 'Project name must be at least 2 characters'),
      validationRules.maxLength(100, 'Project name must be no more than 100 characters')
    ],
    description: [
      validationRules.maxLength(500, 'Description must be no more than 500 characters')
    ],
    managerId: [
      // Optional field, no validation needed
    ],
    companyId: [
      validationRules.required('Company is required')
    ]
  },
  
  task: {
    title: [
      validationRules.required('Task title is required'),
      validationRules.minLength(2, 'Task title must be at least 2 characters'),
      validationRules.maxLength(200, 'Task title must be no more than 200 characters')
    ],
    description: [
      validationRules.maxLength(1000, 'Description must be no more than 1000 characters')
    ],
    priority: [
      validationRules.required('Priority is required')
    ],
    status: [
      validationRules.required('Status is required')
    ],
    dueDate: [
      validationRules.futureDate('Due date must be in the future')
    ],
    estimatedHours: [
      validationRules.positiveNumber('Estimated hours must be a positive number')
    ]
  },
  
  userInvitation: {
    email: [
      validationRules.required('Email is required'),
      validationRules.email('Please enter a valid email address')
    ],
    fullName: [
      validationRules.required('Full name is required'),
      validationRules.minLength(2, 'Full name must be at least 2 characters'),
      validationRules.maxLength(100, 'Full name must be no more than 100 characters')
    ],
    role: [
      validationRules.required('Role is required')
    ]
  },
  
  form: {
    title: [
      validationRules.required('Form title is required'),
      validationRules.minLength(2, 'Form title must be at least 2 characters'),
      validationRules.maxLength(100, 'Form title must be no more than 100 characters')
    ],
    description: [
      validationRules.maxLength(500, 'Description must be no more than 500 characters')
    ]
  }
}

// Hook for form validation
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  schema: Record<keyof T, ValidationRule[]>
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>)
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>)
  
  const setValue = (field: keyof T, value: unknown) => {
    setValues(prev => ({ ...prev, [field]: value }))
    
    // Validate field on change if it's been touched
    if (touched[field]) {
      const error = validateField(value, schema[field])
      setErrors(prev => ({ ...prev, [field]: error || '' }))
    }
  }
  
  const setFieldTouched = (field: keyof T, touchedValue = true) => {
    setTouched(prev => ({ ...prev, [field]: touchedValue }))
    
    // Validate field when touched
    const error = validateField(values[field], schema[field])
    setErrors(prev => ({ ...prev, [field]: error || '' }))
  }
  
  const validateForm = (): boolean => {
    const fields: Record<string, FieldValidation> = {}
    
    for (const [fieldName, fieldRules] of Object.entries(schema)) {
      fields[fieldName] = {
        value: values[fieldName as keyof T],
        rules: fieldRules,
        touched: true
      }
    }
    
    const result = validateFields(fields)
    setErrors(result.errors as Record<keyof T, string>)
    setTouched(Object.keys(schema).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<keyof T, boolean>))
    
    return result.isValid
  }
  
  const reset = () => {
    setValues(initialValues)
    setErrors({} as Record<keyof T, string>)
    setTouched({} as Record<keyof T, boolean>)
  }
  
  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateForm,
    reset,
    isValid: Object.values(errors).every(error => !error)
  }
}

// Import useState for the hook
import { useState } from 'react'
