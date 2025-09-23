import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'textarea' | 'select'
  value: unknown
  onChange: (value: unknown) => void
  onBlur?: () => void
  error?: string
  touched?: boolean
  placeholder?: string
  required?: boolean
  disabled?: boolean
  options?: Array<{ value: string; label: string }>
  rows?: number
  min?: number
  max?: number
  step?: number
  className?: string
  labelClassName?: string
  inputClassName?: string
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  required,
  disabled,
  options,
  rows = 3,
  min,
  max,
  step,
  className,
  labelClassName,
  inputClassName
}: FormFieldProps) {
  const hasError = touched && error
  
  const baseInputClasses = cn(
    'transition-colors duration-200',
    hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
    !hasError && 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    inputClassName
  )
  
  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={name}
            name={name}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={baseInputClasses}
          />
        )
      
      case 'select':
        return (
          <Select
            value={String(value || '')}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className={baseInputClasses}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'number':
        return (
          <Input
            id={name}
            name={name}
            type="number"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            className={baseInputClasses}
          />
        )
      
      case 'date':
        return (
          <Input
            id={name}
            name={name}
            type="date"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className={baseInputClasses}
          />
        )
      
      default:
        return (
          <Input
            id={name}
            name={name}
            type={type}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
          />
        )
    }
  }
  
  return (
    <div className={cn('space-y-2', className)}>
      <Label 
        htmlFor={name}
        className={cn(
          'text-sm font-medium text-gray-700',
          hasError && 'text-red-700',
          labelClassName
        )}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {renderInput()}
      
      {hasError && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

// Specialized form field components
export function TextField(props: Omit<FormFieldProps, 'type'>) {
  return <FormField {...props} type="text" />
}

export function EmailField(props: Omit<FormFieldProps, 'type'>) {
  return <FormField {...props} type="email" />
}

export function PasswordField(props: Omit<FormFieldProps, 'type'>) {
  return <FormField {...props} type="password" />
}

export function NumberField(props: Omit<FormFieldProps, 'type'>) {
  return <FormField {...props} type="number" />
}

export function DateField(props: Omit<FormFieldProps, 'type'>) {
  return <FormField {...props} type="date" />
}

export function TextAreaField(props: Omit<FormFieldProps, 'type'>) {
  return <FormField {...props} type="textarea" />
}

export function SelectField(props: Omit<FormFieldProps, 'type'>) {
  return <FormField {...props} type="select" />
}
