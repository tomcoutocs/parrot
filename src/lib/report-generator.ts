import { fetchLeads, fetchLeadStages, fetchLeadActivities, type Lead, type LeadActivity } from './database-functions'
import { ReportConfig } from '@/components/modals/report-builder-modal'

export interface ReportData {
  labels: string[]
  values: number[]
  data: Array<{ name: string; value: number; [key: string]: any }>
  summary?: {
    total?: number
    average?: number
    min?: number
    max?: number
  }
}

export async function generateReport(
  config: ReportConfig,
  spaceId: string
): Promise<{ success: boolean; data?: ReportData; error?: string }> {
  try {
    // Fetch base data
    const [leadsResult, stagesResult] = await Promise.all([
      fetchLeads({ spaceId }),
      fetchLeadStages(spaceId),
    ])

    const leads = leadsResult.success ? leadsResult.leads || [] : []
    const stages = stagesResult.success ? stagesResult.stages || [] : []

    // Apply filters
    let filteredLeads = leads

    if (config.filters.dateRange) {
      const { from, to } = config.filters.dateRange
      filteredLeads = filteredLeads.filter(lead => {
        const leadDate = new Date(lead.created_at)
        return leadDate >= from && leadDate <= to
      })
    }

    if (config.filters.stageIds && config.filters.stageIds.length > 0) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.stage_id && config.filters.stageIds!.includes(lead.stage_id)
      )
    }

    if (config.filters.statuses && config.filters.statuses.length > 0) {
      filteredLeads = filteredLeads.filter(lead =>
        lead.status && config.filters.statuses!.includes(lead.status)
      )
    }

    // Generate report data based on metrics and grouping
    const reportData = await generateReportData(
      config,
      filteredLeads,
      stages,
      spaceId
    )

    return { success: true, data: reportData }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate report' }
  }
}

async function generateReportData(
  config: ReportConfig,
  leads: Lead[],
  stages: any[],
  spaceId: string
): Promise<ReportData> {
  const data: Array<{ name: string; value: number; [key: string]: any }> = []
  const labels: string[] = []
  const values: number[] = []

  // Handle grouping
  if (config.groupBy) {
    const grouped = groupData(config.groupBy, leads, stages, config.dateGrouping)
    
    for (const [key, groupLeads] of Object.entries(grouped)) {
      const value = calculateMetricValue(config.metrics[0], groupLeads, stages)
      labels.push(key)
      values.push(value)
      data.push({ name: key, value })
    }
  } else {
    // No grouping - single value
    const value = calculateMetricValue(config.metrics[0], leads, stages)
    labels.push('Total')
    values.push(value)
    data.push({ name: 'Total', value })
  }

  // Calculate summary statistics
  const summary = {
    total: values.reduce((sum, v) => sum + v, 0),
    average: values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
  }

  return { labels, values, data, summary }
}

function groupData(
  groupBy: string,
  leads: Lead[],
  stages: any[],
  dateGrouping?: 'day' | 'week' | 'month' | 'quarter' | 'year'
): Record<string, Lead[]> {
  const grouped: Record<string, Lead[]> = {}

  if (groupBy === 'stage') {
    leads.forEach(lead => {
      const stage = stages.find(s => s.id === lead.stage_id)
      const key = stage?.name || lead.status || 'Unknown'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(lead)
    })
  } else if (groupBy === 'status') {
    leads.forEach(lead => {
      const key = lead.status || 'Unknown'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(lead)
    })
  } else if (groupBy === 'date') {
    leads.forEach(lead => {
      const date = new Date(lead.created_at)
      let key: string

      if (dateGrouping === 'day') {
        key = date.toLocaleDateString()
      } else if (dateGrouping === 'week') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = `Week of ${weekStart.toLocaleDateString()}`
      } else if (dateGrouping === 'month') {
        key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      } else if (dateGrouping === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        key = `Q${quarter} ${date.getFullYear()}`
      } else {
        key = date.getFullYear().toString()
      }

      if (!grouped[key]) grouped[key] = []
      grouped[key].push(lead)
    })
  } else if (groupBy === 'source') {
    leads.forEach(lead => {
      const key = lead.source_id || 'Unknown'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(lead)
    })
  }

  return grouped
}

function calculateMetricValue(
  metricId: string,
  leads: Lead[],
  stages: any[]
): number {
  if (!metricId) return 0

  switch (metricId) {
    case 'total_leads':
      return leads.length

    case 'total_revenue':
      return leads
        .filter(l => l.status === 'closed_won' && l.budget)
        .reduce((sum, l) => sum + (l.budget || 0), 0)

    case 'avg_deal_size':
      const wonDeals = leads.filter(l => l.status === 'closed_won' && l.budget)
      if (wonDeals.length === 0) return 0
      return wonDeals.reduce((sum, l) => sum + (l.budget || 0), 0) / wonDeals.length

    case 'conversion_rate':
      const total = leads.length
      const converted = leads.filter(l => l.status === 'closed_won').length
      return total > 0 ? (converted / total) * 100 : 0

    case 'win_rate':
      const closed = leads.filter(l =>
        l.status === 'closed_won' || l.status === 'closed_lost'
      )
      const won = leads.filter(l => l.status === 'closed_won').length
      return closed.length > 0 ? (won / closed.length) * 100 : 0

    case 'pipeline_value':
      return leads
        .filter(l => l.status !== 'closed_won' && l.status !== 'closed_lost' && l.budget)
        .reduce((sum, l) => sum + (l.budget || 0), 0)

    default:
      return 0
  }
}

export async function generateActivityReport(
  config: ReportConfig,
  spaceId: string
): Promise<{ success: boolean; data?: ReportData; error?: string }> {
  try {
    const leadsResult = await fetchLeads({ spaceId })
    const leads = leadsResult.success ? leadsResult.leads || [] : []

    // Fetch activities for all leads
    const allActivities: LeadActivity[] = []
    for (const lead of leads) {
      const activitiesResult = await fetchLeadActivities(lead.id)
      if (activitiesResult.success && activitiesResult.activities) {
        allActivities.push(...activitiesResult.activities)
      }
    }

    // Apply date filter
    let filteredActivities = allActivities
    if (config.filters.dateRange) {
      const { from, to } = config.filters.dateRange
      filteredActivities = filteredActivities.filter(activity => {
        const activityDate = new Date(activity.created_at)
        return activityDate >= from && activityDate <= to
      })
    }

    // Group activities
    const grouped: Record<string, LeadActivity[]> = {}
    
    if (config.groupBy === 'date' && config.dateGrouping) {
      filteredActivities.forEach(activity => {
        const date = new Date(activity.created_at)
        let key: string

        if (config.dateGrouping === 'day') {
          key = date.toLocaleDateString()
        } else if (config.dateGrouping === 'week') {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = `Week of ${weekStart.toLocaleDateString()}`
        } else if (config.dateGrouping === 'month') {
          key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        } else if (config.dateGrouping === 'quarter') {
          const quarter = Math.floor(date.getMonth() / 3) + 1
          key = `Q${quarter} ${date.getFullYear()}`
        } else {
          key = date.getFullYear().toString()
        }

        if (!grouped[key]) grouped[key] = []
        grouped[key].push(activity)
      })
    } else {
      // Group by activity type
      filteredActivities.forEach(activity => {
        const key = activity.activity_type || 'Unknown'
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(activity)
      })
    }

    // Calculate values
    const data: Array<{ name: string; value: number }> = []
    const labels: string[] = []
    const values: number[] = []

    for (const [key, activities] of Object.entries(grouped)) {
      let value = 0
      
      if (config.metrics.includes('total_calls')) {
        value += activities.filter(a => a.activity_type === 'call_made' || a.activity_type === 'call_received').length
      }
      if (config.metrics.includes('total_emails')) {
        value += activities.filter(a => a.activity_type === 'email_sent').length
      }
      if (config.metrics.includes('total_meetings')) {
        value += activities.filter(a => a.activity_type === 'meeting_scheduled' || a.activity_type === 'meeting_completed').length
      }
      if (value === 0) {
        value = activities.length
      }

      labels.push(key)
      values.push(value)
      data.push({ name: key, value })
    }

    const summary = {
      total: values.reduce((sum, v) => sum + v, 0),
      average: values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    }

    return { success: true, data: { labels, values, data, summary } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate activity report' }
  }
}
