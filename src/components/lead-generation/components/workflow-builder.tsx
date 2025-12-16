"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function WorkflowBuilder({ workflowId }: { workflowId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Builder</CardTitle>
        <CardDescription>Create automated sequences for your leads</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Workflow Name</Label>
          <Input placeholder="Enter workflow name" />
        </div>

        <div className="space-y-2">
          <Label>Trigger</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="form-submit">Form Submitted</SelectItem>
              <SelectItem value="page-visit">Page Visited</SelectItem>
              <SelectItem value="email-open">Email Opened</SelectItem>
              <SelectItem value="link-click">Link Clicked</SelectItem>
              <SelectItem value="score-threshold">Score Reached</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Actions</Label>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Action
            </Button>
          </div>
          
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 bg-background rounded border">
                <div className="text-sm font-medium">Send Email</div>
                <div className="text-xs text-muted-foreground mt-1">Welcome email template</div>
              </div>
              <Button variant="ghost" size="sm">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="text-center text-muted-foreground text-sm py-2">
              ↓
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 bg-background rounded border">
                <div className="text-sm font-medium">Assign to Team</div>
                <div className="text-xs text-muted-foreground mt-1">Sales team</div>
              </div>
              <Button variant="ghost" size="sm">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button variant="outline">Save Workflow</Button>
        </div>
      </CardContent>
    </Card>
  )
}

