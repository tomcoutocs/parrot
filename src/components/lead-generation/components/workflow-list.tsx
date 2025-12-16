"use client"

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

const workflows = [
  { id: '1', name: 'Welcome Sequence', status: 'active', triggers: 45 },
  { id: '2', name: 'Lead Nurture', status: 'active', triggers: 32 },
  { id: '3', name: 'Re-engagement', status: 'paused', triggers: 12 },
  { id: '4', name: 'Demo Follow-up', status: 'active', triggers: 28 },
]

export function WorkflowList({ 
  selectedWorkflow, 
  onSelectWorkflow 
}: { 
  selectedWorkflow: string | null
  onSelectWorkflow: (id: string) => void 
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <Button variant="outline" className="w-full mb-4">
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
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
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {workflow.status === 'active' ? (
                        <Play className="w-3 h-3 mr-1" />
                      ) : (
                        <Pause className="w-3 h-3 mr-1" />
                      )}
                      {workflow.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {workflow.triggers} triggers
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>
                      {workflow.status === 'active' ? 'Pause' : 'Activate'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

