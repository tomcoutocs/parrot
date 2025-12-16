"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Mail, Phone, Building2 } from 'lucide-react'

const templates = [
  {
    id: 'contact',
    name: 'Contact Form',
    description: 'Basic contact information capture',
    icon: Mail,
    fields: ['Name', 'Email', 'Message'],
  },
  {
    id: 'demo',
    name: 'Demo Request',
    description: 'Capture leads interested in a demo',
    icon: Phone,
    fields: ['Name', 'Email', 'Company', 'Phone'],
  },
  {
    id: 'newsletter',
    name: 'Newsletter Signup',
    description: 'Simple email capture for newsletters',
    icon: FileText,
    fields: ['Email'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Contact',
    description: 'Comprehensive form for enterprise leads',
    icon: Building2,
    fields: ['Name', 'Email', 'Company', 'Phone', 'Company Size', 'Industry'],
  },
]

export function FormTemplates({ onSelectTemplate }: { onSelectTemplate: (id: string) => void }) {
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
                  {template.fields.map((field) => (
                    <span
                      key={field}
                      className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                    >
                      {field}
                    </span>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => onSelectTemplate(template.id)}
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

