"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Play, Save, Zap, Plus, Loader2 } from 'lucide-react'
import { WorkflowCanvas, type WorkflowNode, type WorkflowConnection } from '../components/workflow-canvas'
import { 
  createAutomation, 
  updateAutomation, 
  saveAutomationNodes, 
  saveAutomationConnections,
  getAutomation,
  type Automation 
} from '@/lib/automation-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export function AutomationsBuilder() {
  const { data: session } = useSession()
  const router = useRouter()
  const [automationName, setAutomationName] = useState('')
  const [automationDescription, setAutomationDescription] = useState('')
  const [triggerType, setTriggerType] = useState<'webhook' | 'schedule' | 'event' | 'api' | 'manual'>('webhook')
  const [currentAutomationId, setCurrentAutomationId] = useState<string | null>(null)
  const [loadedTriggerConfig, setLoadedTriggerConfig] = useState<Record<string, unknown> | null>(null)
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [connections, setConnections] = useState<WorkflowConnection[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const searchParams = useSearchParams()

  // Load automation from URL if editing
  useEffect(() => {
    const loadAutomation = async () => {
      const id = searchParams.get('id')
      if (id) {
        const result = await getAutomation(id)
        if (result.success && result.data) {
          const automation = result.data
          setCurrentAutomationId(automation.id)
          setAutomationName(automation.name)
          setAutomationDescription(automation.description || '')
          setTriggerType(automation.trigger_type)
          setLoadedTriggerConfig((automation.trigger_config as Record<string, unknown>) || {})
          
          // Convert database nodes to workflow nodes
          const workflowNodes: WorkflowNode[] = automation.nodes.map(node => ({
            id: node.id,
            type: node.node_type as WorkflowNode['type'],
            subtype: node.node_subtype || '',
            title: node.title || '',
            description: node.description || undefined,
            x: node.position_x,
            y: node.position_y,
            config: node.config || {},
            isEnabled: node.is_enabled,
          }))
          setNodes(workflowNodes)

          // Convert database connections to workflow connections
          const workflowConnections: WorkflowConnection[] = automation.connections.map(conn => ({
            id: conn.id,
            sourceId: conn.source_node_id,
            targetId: conn.target_node_id,
            conditionType: conn.condition_type as 'always' | 'if' | 'unless' | undefined,
            conditionConfig: conn.condition_config,
          }))
          setConnections(workflowConnections)
        }
      }
    }
    loadAutomation()
  }, [])

  const handleSaveClick = () => {
    if (nodes.length === 0) {
      toastError('Please add at least one node to your automation')
      return
    }
    setShowSaveDialog(true)
  }

  const handleSave = async () => {
    if (!automationName.trim()) {
      toastError('Please enter an automation name')
      return
    }

    if (nodes.length === 0) {
      toastError('Please add at least one node to your automation')
      return
    }

    setIsSaving(true)
    try {
      const spaceId = session?.user?.company_id || null

      if (currentAutomationId) {
        // Update existing automation - ensure webhook_token for webhook triggers
        const updates: { name: string; description: string; trigger_type: typeof triggerType; trigger_config?: Record<string, unknown> } = {
          name: automationName,
          description: automationDescription,
          trigger_type: triggerType,
        }
        if (triggerType === 'webhook') {
          const triggerConfig = loadedTriggerConfig || {}
          updates.trigger_config = !triggerConfig.webhook_token
            ? { ...triggerConfig, webhook_token: crypto.randomUUID() }
            : triggerConfig
        }
        await updateAutomation(currentAutomationId, updates)

        // Save nodes
        const nodesToSave = nodes.map((node, index) => ({
          node_type: node.type,
          node_subtype: node.subtype,
          position_x: node.x,
          position_y: node.y,
          title: node.title,
          description: node.description || null,
          config: node.config,
          order_index: index,
          is_enabled: node.isEnabled,
          error_handling: {},
        }))

        await saveAutomationNodes(currentAutomationId, nodesToSave)

        // Save connections
        const connectionsToSave = connections.map((conn, index) => ({
          source_node_id: conn.sourceId,
          target_node_id: conn.targetId,
          condition_type: conn.conditionType || null,
          condition_config: conn.conditionConfig || null,
          order_index: index,
        }))

        await saveAutomationConnections(currentAutomationId, connectionsToSave)

        toastSuccess('Automation saved successfully')
        setShowSaveDialog(false)
      } else {
        // Create new automation
        const result = await createAutomation(
          automationName,
          automationDescription,
          triggerType,
          {},
          spaceId || undefined
        )

        if (result.success && result.data) {
          setCurrentAutomationId(result.data.id)

          // Save nodes
          const nodesToSave = nodes.map((node, index) => ({
            node_type: node.type,
            node_subtype: node.subtype,
            position_x: node.x,
            position_y: node.y,
            title: node.title,
            description: node.description || null,
            config: node.config,
            order_index: index,
            is_enabled: node.isEnabled,
            error_handling: {},
          }))

          await saveAutomationNodes(result.data.id, nodesToSave)

          // Save connections
          const connectionsToSave = connections.map((conn, index) => ({
            source_node_id: conn.sourceId,
            target_node_id: conn.targetId,
            condition_type: conn.conditionType || null,
            condition_config: conn.conditionConfig || null,
            order_index: index,
          }))

          await saveAutomationConnections(result.data.id, connectionsToSave)

          toastSuccess('Automation created successfully')
          setShowSaveDialog(false)
        } else {
          toastError(result.error || 'Failed to create automation')
        }
      }
    } catch (error) {
      console.error('Error saving automation:', error)
      toastError('Failed to save automation')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!currentAutomationId) {
      toastError('Please save the automation first before testing')
      return
    }

    if (nodes.length === 0) {
      toastError('Please add at least one node to test')
      return
    }

    setIsTesting(true)
    try {
      const response = await fetch('/api/automations/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationId: currentAutomationId,
          triggerData: {
            test: true,
            timestamp: new Date().toISOString(),
          },
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        toastSuccess('Test execution completed successfully')
        // Reload automation to get updated stats
        if (currentAutomationId) {
          const automationResult = await getAutomation(currentAutomationId)
          if (automationResult.success && automationResult.data) {
            // Update local state if needed
          }
        }
      } else {
        toastError(result.error || 'Test execution failed')
      }
    } catch (error) {
      console.error('Error testing automation:', error)
      toastError('Failed to test automation')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Minimal Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-bold">Automation Builder</h2>
          {currentAutomationId && automationName && (
            <p className="text-sm text-muted-foreground mt-1">{automationName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleTest} disabled={isTesting || !currentAutomationId || nodes.length === 0}>
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Test
              </>
            )}
          </Button>
          <Button onClick={handleSaveClick} disabled={isSaving || nodes.length === 0}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {currentAutomationId ? 'Save Changes' : 'Save'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Builder Canvas */}
      <div className="flex-1 min-h-0">
        <WorkflowCanvas
          nodes={nodes}
          connections={connections}
          onNodesChange={setNodes}
          onConnectionsChange={setConnections}
        />
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentAutomationId ? 'Update Automation' : 'Save Automation'}</DialogTitle>
            <DialogDescription>
              {currentAutomationId 
                ? 'Update your automation details and save changes'
                : 'Enter details to save your automation workflow'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="mb-2 block">Automation Name</Label>
                <Input
                  value={automationName}
                  onChange={(e) => setAutomationName(e.target.value)}
                  placeholder="My Automation"
                />
              </div>
              <div className="flex-1">
                <Label className="mb-2 block">Trigger Type</Label>
                <Select value={triggerType} onValueChange={(value: any) => setTriggerType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Description</Label>
              <Input
                value={automationDescription}
                onChange={(e) => setAutomationDescription(e.target.value)}
                placeholder="What does this automation do?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !automationName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

