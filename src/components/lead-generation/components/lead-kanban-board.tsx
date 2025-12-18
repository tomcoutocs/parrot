"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { fetchLeads, fetchLeadStages, updateLead, createLeadActivity, type Lead, type LeadStage } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { fetchLeadSources } from '@/lib/database-functions'

export function LeadKanbanBoard({ searchQuery, filters }: { searchQuery: string; filters: any }) {
  const { data: session } = useSession()
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<LeadStage[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      
      try {
        // Fetch leads with filters
        const leadsResult = await fetchLeads({
          spaceId: session.user.company_id,
          stageId: filters.status !== 'all' ? undefined : undefined,
          sourceId: filters.source !== 'all' ? undefined : undefined,
          searchQuery: searchQuery || undefined,
          minScore: filters.score !== 'all' && filters.score === 'high' ? 70 : undefined,
          maxScore: filters.score !== 'all' && filters.score === 'low' ? 69 : undefined,
        })

        // Fetch stages
        const stagesResult = await fetchLeadStages(session.user.company_id)

        // Fetch sources
        const sourcesResult = await fetchLeadSources(session.user.company_id)

        if (leadsResult.success && leadsResult.leads) {
          setLeads(leadsResult.leads)
        }

        if (stagesResult.success && stagesResult.stages) {
          setStages(stagesResult.stages)
        }

        if (sourcesResult.success && sourcesResult.sources) {
          setSources(sourcesResult.sources)
        }
      } catch (error) {
        console.error('Error loading lead data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session?.user?.id, session?.user?.company_id, searchQuery, filters.source, filters.score, filters.status])

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const grouped: Record<string, Lead[]> = {}
    
    // Initialize all stages
    stages.forEach(stage => {
      grouped[stage.id] = []
    })

    // Group leads by stage_id
    leads.forEach(lead => {
      const stageId = lead.stage_id || 'unassigned'
      if (!grouped[stageId]) {
        grouped[stageId] = []
      }
      grouped[stageId].push(lead)
    })

    return grouped
  }, [leads, stages])

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result

    if (source.droppableId === destination.droppableId) return

    // Find the lead being moved
    const sourceLeads = leadsByStage[source.droppableId] || []
    const lead = sourceLeads.find(l => l.id === draggableId)

    if (!lead) return

    // Update lead stage in database
    const updateResult = await updateLead(lead.id, {
      stage_id: destination.droppableId,
      status: stages.find(s => s.id === destination.droppableId)?.name.toLowerCase().replace(' ', '_') || 'new',
    })

    if (updateResult.success) {
      // Update local state
      setLeads(prevLeads =>
        prevLeads.map(l =>
          l.id === lead.id
            ? { ...l, stage_id: destination.droppableId }
            : l
        )
      )

      // Log activity
      await createLeadActivity({
        lead_id: lead.id,
        activity_type: 'stage_changed',
        description: `Moved to ${stages.find(s => s.id === destination.droppableId)?.name || 'new stage'}`,
        activity_data: {
          from_stage: source.droppableId,
          to_stage: destination.droppableId,
        },
      })
    }
  }

  const getLeadName = (lead: Lead) => {
    if (lead.first_name || lead.last_name) {
      return `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
    }
    return lead.email || 'Unknown'
  }

  const getInitials = (lead: Lead) => {
    const name = getLeadName(lead)
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'L'
  }

  const getSourceName = (sourceId?: string) => {
    if (!sourceId) return 'Unknown'
    const source = sources.find(s => s.id === sourceId)
    return source?.name || 'Unknown'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading leads...</div>
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">No stages configured. Please create stages first.</div>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = leadsByStage[stage.id] || []
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
                        <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
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
                              className={`p-3 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-move ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs">
                                      {getInitials(lead)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-sm">{getLeadName(lead)}</div>
                                    <div className="text-xs text-muted-foreground">{lead.email || 'No email'}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge variant={lead.score >= 80 ? 'default' : 'secondary'} className="text-xs">
                                  {lead.score}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{getSourceName(lead.source_id)}</span>
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

