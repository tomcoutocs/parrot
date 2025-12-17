"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Play, Pause, Trash2 } from 'lucide-react'
import { WorkflowBuilder } from '../components/workflow-builder'
import { WorkflowList } from '../components/workflow-list'

export function AutomationWorkflows() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow List */}
        <div className="lg:col-span-1">
          <WorkflowList 
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={setSelectedWorkflow}
          />
        </div>

        {/* Workflow Builder */}
        <div className="lg:col-span-2">
          {selectedWorkflow ? (
            <WorkflowBuilder workflowId={selectedWorkflow} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">Select a workflow to edit</p>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Workflow
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

