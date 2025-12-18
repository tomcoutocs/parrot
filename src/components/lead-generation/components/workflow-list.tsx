"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Play, Pause, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fetchLeadWorkflows, updateLeadWorkflow, deleteLeadWorkflow, type LeadWorkflow } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

export function WorkflowList({ 
  selectedWorkflow, 
  onSelectWorkflow
}: { 
  selectedWorkflow: string | null
  onSelectWorkflow: (id: string) => void
}) {
  const { data: session } = useSession()
  const [workflows, setWorkflows] = useState<LeadWorkflow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadWorkflows = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const result = await fetchLeadWorkflows(session.user.company_id)

        if (result.success && result.workflows) {
          setWorkflows(result.workflows)
        }
      } catch (error) {
        console.error('Error loading workflows:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWorkflows()
  }, [session?.user?.id, session?.user?.company_id])

  const reloadWorkflows = async () => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const result = await fetchLeadWorkflows(session.user.company_id)

      if (result.success && result.workflows) {
        setWorkflows(result.workflows)
      }
    } catch (error) {
      console.error('Error loading workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (workflowId: string, currentStatus: boolean) => {
    const result = await updateLeadWorkflow(workflowId, { is_active: !currentStatus })
    
    if (result.success) {
      toastSuccess(`Workflow ${!currentStatus ? 'activated' : 'paused'}`)
      // Reload workflows to ensure consistency
      await reloadWorkflows()
    } else {
      toastError(result.error || 'Failed to update workflow')
    }
  }

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    const result = await deleteLeadWorkflow(workflowId)
    
    if (result.success) {
      toastSuccess('Workflow deleted')
      if (selectedWorkflow === workflowId) {
        onSelectWorkflow('')
      }
      // Reload workflows to ensure consistency
      await reloadWorkflows()
    } else {
      toastError(result.error || 'Failed to delete workflow')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-8 text-muted-foreground">Loading workflows...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-4">
        <Button 
          variant="outline" 
          className="w-full mb-4"
          onClick={() => onSelectWorkflow('new')}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
        {workflows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No workflows yet. Create your first workflow to automate lead nurturing.
          </div>
        ) : (
          <div className="space-y-2">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                onClick={() => onSelectWorkflow(workflow.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedWorkflow === workflow.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{workflow.name}</div>
                    {workflow.description && (
                      <div className="text-xs text-muted-foreground mt-1">{workflow.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={workflow.is_active ? 'default' : 'secondary'} className="text-xs">
                        {workflow.is_active ? (
                          <Play className="w-3 h-3 mr-1" />
                        ) : (
                          <Pause className="w-3 h-3 mr-1" />
                        )}
                        {workflow.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectWorkflow(workflow.id) }}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleActive(workflow.id, workflow.is_active) }}>
                        {workflow.is_active ? 'Pause' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(workflow.id) }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

