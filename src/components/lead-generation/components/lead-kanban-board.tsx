"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { fetchLeads, fetchLeadStages, updateLead, createLeadActivity, type Lead, type LeadStage } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { fetchLeadSources } from '@/lib/database-functions'
import LeadDetailModal from '@/components/modals/lead-detail-modal'
import { Plus, Mail, Phone, ChevronRight, Briefcase, Calendar } from 'lucide-react'

export function LeadKanbanBoard({ searchQuery, filters }: { searchQuery: string; filters: any }) {
  const { data: session } = useSession()
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<LeadStage[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      
      try {
        // Fetch stages and sources first (needed for filtering)
        const stagesResult = await fetchLeadStages(session.user.company_id)
        const sourcesResult = await fetchLeadSources(session.user.company_id)

        if (stagesResult.success && stagesResult.stages) {
          setStages(stagesResult.stages)
        }

        if (sourcesResult.success && sourcesResult.sources) {
          setSources(sourcesResult.sources)
        }

        // Find source ID from source type filter
        let sourceId: string | undefined = undefined
        if (filters.source && filters.source !== 'all' && sourcesResult.success && sourcesResult.sources) {
          // Find the source that matches the filter type
          const matchingSource = sourcesResult.sources.find(
            (source: any) => source.type === filters.source
          )
          if (matchingSource) {
            sourceId = matchingSource.id
          }
        }

        // Fetch leads with filters
        const leadsResult = await fetchLeads({
          spaceId: session.user.company_id,
          stageId: filters.status !== 'all' ? undefined : undefined,
          sourceId: sourceId,
          searchQuery: searchQuery || undefined,
          minScore: filters.score !== 'all' && filters.score === 'high' ? 70 : undefined,
          maxScore: filters.score !== 'all' && filters.score === 'low' ? 69 : undefined,
        })

        if (leadsResult.success && leadsResult.leads) {
          setLeads(leadsResult.leads)
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays}d ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }))
  }

  // Initialize all stages as expanded by default
  useEffect(() => {
    if (stages.length > 0 && Object.keys(expandedStages).length === 0) {
      const initialExpanded: Record<string, boolean> = {}
      stages.forEach(stage => {
        initialExpanded[stage.id] = true
      })
      setExpandedStages(initialExpanded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages])

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
      <div className="space-y-2">
        {stages.map((stage) => {
          const stageLeads = leadsByStage[stage.id] || []
          const isExpanded = expandedStages[stage.id] !== false // Default to true
          
          return (
            <Droppable key={stage.id} droppableId={stage.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-card border rounded-lg"
                >
                  {/* Stage Header - Expandable */}
                  <button
                    onClick={() => toggleStage(stage.id)}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <ChevronRight 
                      className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                    <span className="font-semibold text-sm flex-1">{stage.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {stageLeads.length}
                    </Badge>
                  </button>

                  {/* Leads List - Only show when expanded */}
                  {isExpanded && (
                    <div className="border-t">
                      {/* Table Header */}
                      {stageLeads.length > 0 && (
                        <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground border-b">
                          <div className="col-span-3">Name</div>
                          <div className="col-span-2">Contact</div>
                          <div className="col-span-2">Job Title</div>
                          <div className="col-span-1 text-center">Score</div>
                          <div className="col-span-2 text-center">Source</div>
                          <div className="col-span-2 text-center">Created</div>
                        </div>
                      )}

                      {/* Leads Rows */}
                      <Droppable droppableId={stage.id}>
                        {(provided, snapshot) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={snapshot.isDraggingOver ? 'bg-muted/20' : ''}
                          >
                            {stageLeads.map((lead, index) => (
                              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`grid grid-cols-12 gap-4 px-4 py-3 border-b hover:bg-muted/30 transition-colors ${
                                      snapshot.isDragging ? 'bg-primary/10 shadow-lg' : ''
                                    }`}
                                  >
                                    {/* Name Column */}
                                    <div 
                                      className="col-span-12 sm:col-span-3 flex items-center gap-2 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedLeadId(lead.id)
                                        setIsDetailModalOpen(true)
                                      }}
                                    >
                                      <Avatar className="h-6 w-6 flex-shrink-0">
                                        <AvatarFallback className="text-xs">
                                          {getInitials(lead)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="font-medium text-sm truncate hover:underline">
                                          {getLeadName(lead)}
                                        </span>
                                        {/* Mobile: Show email below name */}
                                        <span className="sm:hidden text-xs text-muted-foreground truncate">
                                          {lead.email || lead.phone || 'No contact'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Contact Column */}
                                    <div className="hidden sm:flex col-span-2 flex-col gap-1 text-sm text-muted-foreground">
                                      {lead.email && (
                                        <div className="flex items-center gap-1">
                                          <Mail className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate text-xs">{lead.email}</span>
                                        </div>
                                      )}
                                      {lead.phone && (
                                        <div className="flex items-center gap-1">
                                          <Phone className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate text-xs">{lead.phone}</span>
                                        </div>
                                      )}
                                      {!lead.email && !lead.phone && (
                                        <span className="text-xs">No contact</span>
                                      )}
                                    </div>

                                    {/* Job Title Column */}
                                    <div className="hidden sm:flex col-span-2 items-center gap-1 text-sm text-muted-foreground">
                                      {lead.job_title ? (
                                        <>
                                          <Briefcase className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate text-xs">{lead.job_title}</span>
                                        </>
                                      ) : (
                                        <span className="text-xs">—</span>
                                      )}
                                    </div>

                                    {/* Score Column */}
                                    <div className="col-span-6 sm:col-span-1 flex items-center justify-center">
                                      <Badge 
                                        variant={lead.score >= 80 ? 'default' : lead.score >= 50 ? 'secondary' : 'outline'} 
                                        className="text-xs"
                                      >
                                        {lead.score}
                                      </Badge>
                                    </div>

                                    {/* Source Column */}
                                    <div className="col-span-6 sm:col-span-2 flex items-center justify-center">
                                      <Badge variant="outline" className="text-xs">
                                        {getSourceName(lead.source_id)}
                                      </Badge>
                                    </div>

                                    {/* Created Date Column */}
                                    <div className="hidden sm:flex col-span-2 items-center justify-center gap-1 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3 flex-shrink-0" />
                                      <span>{formatDate(lead.created_at)}</span>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {stageLeads.length === 0 && (
                              <div className="text-center py-8 text-sm text-muted-foreground">
                                No leads in {stage.name.toLowerCase()}
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          )
        })}
      </div>

      <LeadDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedLeadId(null)
        }}
        leadId={selectedLeadId}
        onLeadUpdated={() => {
          // Reload leads when lead is updated
          const loadData = async () => {
            if (!session?.user?.id) return

            try {
              const stagesResult = await fetchLeadStages(session.user.company_id)
              const sourcesResult = await fetchLeadSources(session.user.company_id)

              if (stagesResult.success && stagesResult.stages) {
                setStages(stagesResult.stages)
              }

              if (sourcesResult.success && sourcesResult.sources) {
                setSources(sourcesResult.sources)
              }

              let sourceId: string | undefined = undefined
              if (filters.source && filters.source !== 'all' && sourcesResult.success && sourcesResult.sources) {
                const matchingSource = sourcesResult.sources.find(
                  (source: any) => source.type === filters.source
                )
                if (matchingSource) {
                  sourceId = matchingSource.id
                }
              }

              const leadsResult = await fetchLeads({
                spaceId: session.user.company_id,
                stageId: filters.status !== 'all' ? undefined : undefined,
                sourceId: sourceId,
                searchQuery: searchQuery || undefined,
                minScore: filters.score !== 'all' && filters.score === 'high' ? 70 : undefined,
                maxScore: filters.score !== 'all' && filters.score === 'low' ? 69 : undefined,
              })

              if (leadsResult.success && leadsResult.leads) {
                setLeads(leadsResult.leads)
              }
            } catch (error) {
              console.error('Error reloading lead data:', error)
            }
          }
          loadData()
        }}
      />
    </DragDropContext>
  )
}

