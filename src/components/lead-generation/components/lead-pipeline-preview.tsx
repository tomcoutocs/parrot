"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'
import { fetchLeads, fetchLeadStages, type Lead, type LeadStage } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'

// Stage color mapping
const getStageColor = (stageName: string): string => {
  const name = stageName.toLowerCase()
  if (name.includes('new') || name.includes('lead')) return 'bg-blue-500'
  if (name.includes('contacted') || name.includes('reach')) return 'bg-yellow-500'
  if (name.includes('qualified') || name.includes('interest')) return 'bg-purple-500'
  if (name.includes('proposal') || name.includes('quote') || name.includes('negotiation')) return 'bg-gray-500'
  if (name.includes('won') || name.includes('closed won') || name.includes('converted')) return 'bg-green-500'
  if (name.includes('lost') || name.includes('closed lost')) return 'bg-red-500'
  // Default colors for other stages
  const colors = ['bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-gray-500', 'bg-green-500', 'bg-indigo-500', 'bg-pink-500']
  return colors[stageName.length % colors.length]
}

// Default important stages that should always be shown
const DEFAULT_IMPORTANT_STAGES = [
  { name: 'New', order: 0, color: 'bg-blue-500' },
  { name: 'Contacted', order: 1, color: 'bg-yellow-500' },
  { name: 'Qualified', order: 2, color: 'bg-purple-500' },
  { name: 'Closed Won', order: 3, color: 'bg-green-500' },
]

export function LeadGenerationPipeline() {
  const { data: session } = useSession()
  // Initialize with default stages so they show immediately
  const [stages, setStages] = useState<Array<{ name: string; count: number; color: string; order: number }>>(
    DEFAULT_IMPORTANT_STAGES.map(s => ({ ...s, count: 0 }))
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPipelineData = async () => {
      if (!session?.user?.id) {
        // Show default stages even if no user
        setStages(DEFAULT_IMPORTANT_STAGES.map(s => ({ ...s, count: 0 })))
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Fetch leads and stages - fetchLeads will use RLS if spaceId is undefined
        const [leadsResult, stagesResult] = await Promise.all([
          fetchLeads({ spaceId: session.user.company_id }),
          fetchLeadStages(session.user.company_id)
        ])
        
        console.log('Pipeline Preview - Fetch Results:', {
          leadsSuccess: leadsResult.success,
          leadsCount: leadsResult.leads?.length || 0,
          stagesSuccess: stagesResult.success,
          stagesCount: stagesResult.stages?.length || 0,
          company_id: session.user.company_id
        })

        // Count leads by stage
        const stageCounts: Record<string, number> = {}
        const stageCountsLower: Record<string, number> = {} // Case-insensitive lookup
        const leads = leadsResult.success ? (leadsResult.leads || []) : []
        const leadStages = stagesResult.success ? (stagesResult.stages || []) : []
        
        // Debug logging
        console.log('Pipeline Preview - Leads:', leads.length)
        console.log('Pipeline Preview - Stages:', leadStages.map(s => ({ id: s.id, name: s.name })))
        
        // Normalize status values to stage names
        const normalizeStatusToStageName = (status: string | undefined): string => {
          if (!status) return 'New'
          const statusLower = status.toLowerCase().trim()
          // Map common status values to stage names
          if (statusLower === 'new' || statusLower === 'lead') return 'New'
          if (statusLower === 'contacted' || statusLower === 'reached') return 'Contacted'
          if (statusLower === 'qualified' || statusLower === 'interested') return 'Qualified'
          if (statusLower === 'proposal' || statusLower === 'quote') return 'Proposal'
          if (statusLower === 'negotiation') return 'Negotiation'
          if (statusLower === 'closed_won' || statusLower === 'closed won' || statusLower === 'won') return 'Closed Won'
          if (statusLower === 'closed_lost' || statusLower === 'closed lost' || statusLower === 'lost') return 'Closed Lost'
          return status // Return as-is if no mapping
        }
        
        // Count leads by stage if we have leads
        leads.forEach(lead => {
          const stageId = lead.stage_id
          let stage = leadStages.find(s => s.id === stageId)
          
          // If stage_id doesn't match (possibly due to deduplication), try to match by name
          if (!stage) {
            // First try to match by normalized status
            const normalizedStatus = normalizeStatusToStageName(lead.status)
            stage = leadStages.find(s => 
              s.name.toLowerCase().trim() === normalizedStatus.toLowerCase().trim()
            )
          }
          
          // If still no match, try direct status match (case-insensitive)
          if (!stage && lead.status) {
            const statusLower = lead.status.toLowerCase().trim()
            stage = leadStages.find(s => s.name.toLowerCase().trim() === statusLower)
          }
          
          // Determine final stage name - prefer matched stage name, then normalized status, then raw status, then "New"
          let stageName = stage?.name || normalizeStatusToStageName(lead.status) || 'New'
          
          console.log('Lead:', {
            id: lead.id,
            stage_id: lead.stage_id,
            status: lead.status,
            normalizedStatus: normalizeStatusToStageName(lead.status),
            matchedStage: stage?.name,
            matchedStageId: stage?.id,
            finalStageName: stageName
          })
          
          stageCounts[stageName] = (stageCounts[stageName] || 0) + 1
          // Also store lowercase version for case-insensitive lookup
          const stageNameLower = stageName.toLowerCase().trim()
          stageCountsLower[stageNameLower] = (stageCountsLower[stageNameLower] || 0) + 1
        })
        
        console.log('Stage Counts:', stageCounts)
        console.log('Stage Counts Lower:', stageCountsLower)

        // Start with default important stages
        const importantStagesMap = new Map<string, { name: string; count: number; color: string; order: number }>()
        
        // Initialize with default important stages
        DEFAULT_IMPORTANT_STAGES.forEach(defaultStage => {
          const defaultStageLower = defaultStage.name.toLowerCase()
          // Use case-insensitive lookup
          const count = stageCountsLower[defaultStageLower] || 0
          console.log(`Setting count for "${defaultStage.name}" (${defaultStageLower}):`, count)
          importantStagesMap.set(defaultStageLower, {
            name: defaultStage.name,
            count,
            color: defaultStage.color,
            order: defaultStage.order
          })
        })

        // Add stages from database with their counts
        if (leadStages.length > 0) {
          leadStages.forEach(stage => {
            const stageNameLower = stage.name.toLowerCase()
            const isImportantStage = DEFAULT_IMPORTANT_STAGES.some(
              ds => ds.name.toLowerCase() === stageNameLower
            )
            
            if (isImportantStage) {
              // Update count for important stage using case-insensitive lookup
              const existing = importantStagesMap.get(stageNameLower)
              if (existing) {
                const count = stageCountsLower[stageNameLower] || existing.count
                importantStagesMap.set(stageNameLower, {
                  ...existing,
                  count,
                  color: stage.color || existing.color
                })
              }
            } else {
              // Add non-important stage
              const count = stageCountsLower[stageNameLower] || 0
              importantStagesMap.set(stageNameLower, {
                name: stage.name,
                count,
                color: stage.color || getStageColor(stage.name),
                order: stage.stage_order
              })
            }
          })
        }

        // Also include any stages that have leads but aren't in the stages list
        Object.entries(stageCountsLower).forEach(([stageNameLower, count]) => {
          if (!importantStagesMap.has(stageNameLower)) {
            // Find the original case from stageCounts
            const originalStageName = Object.keys(stageCounts).find(
              name => name.toLowerCase() === stageNameLower
            ) || stageNameLower
            importantStagesMap.set(stageNameLower, {
              name: originalStageName,
              count,
              color: getStageColor(originalStageName),
              order: 999 // Put unknown stages at the end
            })
          }
        })

        // Convert back to array and sort by order
        const finalStages = Array.from(importantStagesMap.values())
          .sort((a, b) => {
            // Important stages first (order 0-3), then others
            if (a.order < 4 && b.order < 4) return a.order - b.order
            if (a.order < 4) return -1
            if (b.order < 4) return 1
            return a.order - b.order
          })

        console.log('Final Stages:', finalStages.map(s => ({ name: s.name, count: s.count })))
        setStages(finalStages)
      } catch (error) {
        console.error('Error loading pipeline data:', error)
        // Always show default stages even on error
        setStages(DEFAULT_IMPORTANT_STAGES.map(s => ({ ...s, count: 0 })))
      } finally {
        setLoading(false)
      }
    }

    loadPipelineData()
  }, [session?.user?.company_id])

  const total = stages.reduce((sum, stage) => sum + stage.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Overview</CardTitle>
        <CardDescription>Leads by stage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          stages.map((stage) => {
            const percentage = total > 0 ? (stage.count / total) * 100 : 0
            return (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <span className="text-sm font-medium">{stage.name}</span>
                  </div>
                  <Badge variant="secondary">{stage.count}</Badge>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

