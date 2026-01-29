"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Mail, Phone, Building2 } from 'lucide-react'

export interface TemplateField {
  label: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select'
  required: boolean
  placeholder?: string
  options?: string[]
}

export interface FormTemplate {
  id: string
  name: string
  description: string
  icon: any
  fields: TemplateField[]
}

export const templates: FormTemplate[] = [
  {
    id: 'contact',
    name: 'Contact Form',
    description: 'Basic contact information capture',
    icon: Mail,
    fields: [
      { label: 'Name', type: 'text', required: true, placeholder: 'Enter your name' },
      { label: 'Email', type: 'email', required: true, placeholder: 'Enter your email' },
      { label: 'Message', type: 'textarea', required: true, placeholder: 'Enter your message' },
    ],
  },
  {
    id: 'demo',
    name: 'Demo Request',
    description: 'Capture leads interested in a demo',
    icon: Phone,
    fields: [
      { label: 'Name', type: 'text', required: true, placeholder: 'Enter your name' },
      { label: 'Email', type: 'email', required: true, placeholder: 'Enter your email' },
      { label: 'Company', type: 'text', required: false, placeholder: 'Enter your company name' },
      { label: 'Phone', type: 'phone', required: false, placeholder: 'Enter your phone number' },
    ],
  },
  {
    id: 'newsletter',
    name: 'Newsletter Signup',
    description: 'Simple email capture for newsletters',
    icon: FileText,
    fields: [
      { label: 'Email', type: 'email', required: true, placeholder: 'Enter your email' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Contact',
    description: 'Comprehensive form for enterprise leads',
    icon: Building2,
    fields: [
      { label: 'Name', type: 'text', required: true, placeholder: 'Enter your name' },
      { label: 'Email', type: 'email', required: true, placeholder: 'Enter your email' },
      { label: 'Company', type: 'text', required: true, placeholder: 'Enter your company name' },
      { label: 'Phone', type: 'phone', required: false, placeholder: 'Enter your phone number' },
      { 
        label: 'Company Size', 
        type: 'select', 
        required: false, 
        placeholder: 'Select company size',
        options: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
      },
      { 
        label: 'Industry', 
        type: 'select', 
        required: false, 
        placeholder: 'Select industry',
        options: ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Other']
      },
    ],
  },
]

export function FormTemplates({ onSelectTemplate }: { onSelectTemplate: (template: FormTemplate) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((template) => {
        const Icon = template.icon
        return (
          <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-sm">{template.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Fields:</p>
                <div className="flex flex-wrap gap-1">
                  {template.fields.map((field, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                    >
                      {field.label}
                    </span>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => onSelectTemplate(template)}
                >
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

