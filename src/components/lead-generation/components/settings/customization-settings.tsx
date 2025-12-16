"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function CustomizationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize the appearance of your forms and emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <Input type="color" defaultValue="#3b82f6" className="w-20 h-10" />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input placeholder="https://example.com/logo.png" />
          </div>
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input placeholder="Your Company" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Defaults</CardTitle>
          <CardDescription>
            Set default values for new forms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Thank You Message</Label>
            <Textarea
              placeholder="Thank you for your interest! We'll be in touch soon."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Default Redirect URL</Label>
            <Input placeholder="https://example.com/thank-you" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>
            Customize your lead pipeline stages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Stages</Label>
            <Select defaultValue="standard">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (New, Contacted, Qualified, Proposal, Closed)</SelectItem>
                <SelectItem value="simple">Simple (New, Qualified, Closed)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline">Save Customization</Button>
        </CardContent>
      </Card>
    </div>
  )
}

