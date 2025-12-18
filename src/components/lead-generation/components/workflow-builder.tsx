"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Save } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createLeadWorkflow, fetchLeadWorkflows, updateLeadWorkflow, fetchWorkflowTriggers, fetchWorkflowActions, type LeadWorkflow } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

interface WorkflowAction {
  id: string
  action_type: string
  action_config: Record<string, any>
  action_order: number
  delay_seconds: number
}

export function WorkflowBuilder({ workflowId, onWorkflowSaved }: { workflowId: string; onWorkflowSaved?: () => void }) {
  const { data: session } = useSession()
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [triggerType, setTriggerType] = useState('')
  const [actions, setActions] = useState<WorkflowAction[]>([])
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    if (workflowId === 'new') {
      setIsNew(true)
      setWorkflowName('')
      setWorkflowDescription('')
      setTriggerType('')
      setActions([])
    } else if (workflowId) {
      setIsNew(false)
      loadWorkflow(workflowId)
    }
  }, [workflowId])

  const loadWorkflow = async (id: string) => {
    if (!session?.user?.id) return

    const workflowsResult = await fetchLeadWorkflows(session.user.company_id)
    if (workflowsResult.success && workflowsResult.workflows) {
      const workflow = workflowsResult.workflows.find(w => w.id === id)
      if (workflow) {
        setWorkflowName(workflow.name)
        setWorkflowDescription(workflow.description || '')
        
        // Load triggers
        const triggersResult = await fetchWorkflowTriggers(id)
        if (triggersResult.success && triggersResult.triggers && triggersResult.triggers.length > 0) {
          setTriggerType(triggersResult.triggers[0].trigger_type)
        }

        // Load actions
        const actionsResult = await fetchWorkflowActions(id)
        if (actionsResult.success && actionsResult.actions) {
          setActions(actionsResult.actions.map((a, idx) => ({
            id: a.id || `action-${idx}`,
            action_type: a.action_type,
            action_config: a.action_config || {},
            action_order: a.action_order,
            delay_seconds: a.delay_seconds || 0,
          })))
        }
      }
    }
  }

  const addAction = () => {
    setActions([...actions, {
      id: `action-${Date.now()}`,
      action_type: 'send_email',
      action_config: {},
      action_order: actions.length,
      delay_seconds: 0,
    }])
  }

  const removeAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id).map((a, idx) => ({ ...a, action_order: idx })))
  }

  const updateAction = (id: string, updates: Partial<WorkflowAction>) => {
    setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  const handleSave = async () => {
    if (!session?.user?.id) {
      toastError('You must be logged in to save workflows')
      return
    }

    if (!workflowName.trim()) {
      toastError('Please enter a workflow name')
      return
    }

    if (!triggerType) {
      toastError('Please select a trigger')
      return
    }

    if (actions.length === 0) {
      toastError('Please add at least one action')
      return
    }

    setSaving(true)

    try {
      if (isNew) {
        const result = await createLeadWorkflow({
          space_id: session.user.company_id,
          name: workflowName,
          description: workflowDescription || undefined,
          is_active: true,
          triggers: [{
            trigger_type: triggerType,
            trigger_conditions: {},
          }],
          actions: actions.map(a => ({
            action_type: a.action_type,
            action_config: a.action_config,
            action_order: a.action_order,
            delay_seconds: a.delay_seconds,
          })),
        })

        if (result.success) {
          toastSuccess('Workflow created successfully')
          if (onWorkflowSaved) onWorkflowSaved()
        } else {
          toastError(result.error || 'Failed to create workflow')
        }
      } else {
        const result = await updateLeadWorkflow(workflowId, {
          name: workflowName,
          description: workflowDescription || undefined,
        })

        if (result.success) {
          toastSuccess('Workflow updated successfully')
          if (onWorkflowSaved) onWorkflowSaved()
        } else {
          toastError(result.error || 'Failed to update workflow')
        }
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to save workflow')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Builder</CardTitle>
        <CardDescription>Create automated sequences for your leads</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Workflow Name *</Label>
          <Input 
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Enter workflow name" 
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
            placeholder="Describe what this workflow does..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Trigger *</Label>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger>
              <SelectValue placeholder="Select trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="form_submit">Form Submitted</SelectItem>
              <SelectItem value="page_visit">Page Visited</SelectItem>
              <SelectItem value="email_open">Email Opened</SelectItem>
              <SelectItem value="link_click">Link Clicked</SelectItem>
              <SelectItem value="score_threshold">Score Reached</SelectItem>
              <SelectItem value="stage_change">Stage Changed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Actions *</Label>
            <Button variant="outline" size="sm" onClick={addAction}>
              <Plus className="w-4 h-4 mr-2" />
              Add Action
            </Button>
          </div>
          
          {actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
              No actions added. Click "Add Action" to get started.
            </div>
          ) : (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
              {actions.map((action, index) => (
                <div key={action.id}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 p-3 bg-background rounded border">
                      <Select
                        value={action.action_type}
                        onValueChange={(value) => updateAction(action.id, { action_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="send_email">Send Email</SelectItem>
                          <SelectItem value="assign_lead">Assign Lead</SelectItem>
                          <SelectItem value="change_stage">Change Stage</SelectItem>
                          <SelectItem value="add_tag">Add Tag</SelectItem>
                          <SelectItem value="update_score">Update Score</SelectItem>
                          <SelectItem value="send_notification">Send Notification</SelectItem>
                          <SelectItem value="wait">Wait</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground mt-2">
                        Delay: <Input
                          type="number"
                          min="0"
                          value={action.delay_seconds}
                          onChange={(e) => updateAction(action.id, { delay_seconds: parseInt(e.target.value) || 0 })}
                          className="inline-block w-20 h-6 text-xs"
                        /> seconds
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeAction(action.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {index < actions.length - 1 && (
                    <div className="text-center text-muted-foreground text-sm py-2">
                      ↓
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : isNew ? 'Create Workflow' : 'Save Workflow'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

