"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { WorkflowBuilder } from '../components/workflow-builder'
import { WorkflowList } from '../components/workflow-list'

export function AutomationWorkflows() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleWorkflowSaved = () => {
    setRefreshKey(prev => prev + 1)
    if (selectedWorkflow === 'new') {
      setSelectedWorkflow(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow List */}
        <div className="lg:col-span-1">
          <WorkflowList 
            key={refreshKey}
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={setSelectedWorkflow}
          />
        </div>

        {/* Workflow Builder */}
        <div className="lg:col-span-2">
          {selectedWorkflow ? (
            <WorkflowBuilder 
              workflowId={selectedWorkflow} 
              onWorkflowSaved={handleWorkflowSaved}
            />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">Select a workflow to edit or create a new one</p>
                <Button variant="outline" onClick={() => setSelectedWorkflow('new')}>
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

