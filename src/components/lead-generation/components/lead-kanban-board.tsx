"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

const initialStages = {
  'new': [
    { id: '1', name: 'John Smith', company: 'Acme Corp', score: 85, source: 'Website' },
    { id: '2', name: 'Sarah Johnson', company: 'TechStart', score: 72, source: 'LinkedIn' },
  ],
  'contacted': [
    { id: '3', name: 'Mike Davis', company: 'Global Solutions', score: 91, source: 'Referral' },
  ],
  'qualified': [
    { id: '4', name: 'Emily Brown', company: 'Innovate Co', score: 88, source: 'Website' },
  ],
  'proposal': [],
  'closed': [],
}

export function LeadKanbanBoard({ searchQuery, filters }: { searchQuery: string; filters: any }) {
  const [stages, setStages] = useState(initialStages)

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    if (source.droppableId === destination.droppableId) return

    const sourceStage = stages[source.droppableId as keyof typeof stages]
    const destStage = stages[destination.droppableId as keyof typeof stages]
    const lead = sourceStage.find(l => l.id === draggableId)

    if (!lead) return

    const newSourceStage = sourceStage.filter(l => l.id !== draggableId)
    const newDestStage = [...destStage]
    newDestStage.splice(destination.index, 0, lead)

    setStages({
      ...stages,
      [source.droppableId]: newSourceStage,
      [destination.droppableId]: newDestStage,
    })
  }

  const stageConfig = [
    { id: 'new', title: 'New', color: 'bg-blue-500' },
    { id: 'contacted', title: 'Contacted', color: 'bg-yellow-500' },
    { id: 'qualified', title: 'Qualified', color: 'bg-purple-500' },
    { id: 'proposal', title: 'Proposal', color: 'bg-gray-500' },
    { id: 'closed', title: 'Closed', color: 'bg-green-500' },
  ]

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stageConfig.map((stage) => {
          const stageLeads = stages[stage.id as keyof typeof stages]
          return (
            <Droppable key={stage.id} droppableId={stage.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-shrink-0 w-72"
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{stage.title}</CardTitle>
                        <Badge variant="secondary">{stageLeads.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 min-h-[400px]">
                      {stageLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 rounded-lg border bg-card hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {lead.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-sm">{lead.name}</div>
                                    <div className="text-xs text-muted-foreground">{lead.company}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge variant={lead.score >= 80 ? 'default' : 'secondary'} className="text-xs">
                                  {lead.score}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{lead.source}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </CardContent>
                  </Card>
                </div>
              )}
            </Droppable>
          )
        })}
      </div>
    </DragDropContext>
  )
}

