"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Code, Link2, QrCode, FileText } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeadFormBuilder } from '../components/lead-form-builder'
import { EmbedCode } from '../components/embed-code'
import { FormTemplates } from '../components/form-templates'

export function LeadCapture() {
  const [activeForm, setActiveForm] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Capture</h1>
          <p className="text-muted-foreground mt-1">
            Create and customize forms to capture leads
          </p>
        </div>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          New Form
        </Button>
      </div>

      <Tabs defaultValue="forms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Builder</CardTitle>
              <CardDescription>
                Create custom lead capture forms with AI-powered personalization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeadFormBuilder />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <FormTemplates onSelectTemplate={(template) => setActiveForm(template)} />
        </TabsContent>

        <TabsContent value="embed" className="space-y-4">
          <EmbedCode formId={activeForm} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

