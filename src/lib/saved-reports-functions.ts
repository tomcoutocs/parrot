import { supabase } from './supabase'
import { getCurrentUser } from './auth'

export interface SavedReport {
  id: string
  name: string
  description?: string
  type: 'dashboard' | 'report' | 'visualization'
  dateRange: string
  chartType: string
  selectedFields: string[]
  filters?: Record<string, string>
  created_by: string
  created_at: string
  updated_at: string
  last_run?: string
  schedule?: 'daily' | 'weekly' | 'monthly' | null
}

// Get all saved reports for the current user
export async function getSavedReports(): Promise<SavedReport[]> {
  if (!supabase) return []

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) return []

    const { data, error } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false })

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return []
      }
      console.error('Error fetching saved reports:', error)
      return []
    }

    return (data || []).map(report => ({
      id: report.id,
      name: report.name,
      description: report.description,
      type: report.type || 'report',
      dateRange: report.date_range || 'last_30_days',
      chartType: report.chart_type || 'table',
      selectedFields: report.selected_fields || [],
      filters: report.filters || {},
      created_by: report.created_by || currentUser.id,
      created_at: report.created_at,
      updated_at: report.updated_at,
      last_run: report.last_run,
      schedule: report.schedule || null,
    }))
  } catch (error) {
    console.error('Error fetching saved reports:', error)
    return []
  }
}

// Save a new report
export async function saveReport(report: {
  name: string
  description?: string
  type: 'dashboard' | 'report' | 'visualization'
  dateRange: string
  chartType: string
  selectedFields: string[]
  filters?: Record<string, string>
  schedule?: 'daily' | 'weekly' | 'monthly' | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Try to insert into saved_reports table
    const { data, error } = await supabase
      .from('saved_reports')
      .insert({
        user_id: currentUser.id,
        name: report.name,
        description: report.description || null,
        type: report.type,
        date_range: report.dateRange,
        chart_type: report.chartType,
        selected_fields: report.selectedFields,
        filters: report.filters || {},
        schedule: report.schedule || null,
      })
      .select('id')
      .single()

    if (error) {
      // If table doesn't exist, fall back to localStorage
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return saveReportToLocalStorage(report)
      }
      return { success: false, error: error.message }
    }

    return { success: true, id: data.id }
  } catch (error) {
    console.error('Error saving report:', error)
    // Fall back to localStorage
    return saveReportToLocalStorage(report)
  }
}

// Update an existing report
export async function updateReport(
  reportId: string,
  updates: Partial<{
    name: string
    description: string
    dateRange: string
    chartType: string
    selectedFields: string[]
    filters: Record<string, string>
    schedule: 'daily' | 'weekly' | 'monthly' | null
  }>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.dateRange !== undefined) updateData.date_range = updates.dateRange
    if (updates.chartType !== undefined) updateData.chart_type = updates.chartType
    if (updates.selectedFields !== undefined) updateData.selected_fields = updates.selectedFields
    if (updates.filters !== undefined) updateData.filters = updates.filters
    if (updates.schedule !== undefined) updateData.schedule = updates.schedule

    const { error } = await supabase
      .from('saved_reports')
      .update(updateData)
      .eq('id', reportId)
      .eq('user_id', currentUser.id)

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return updateReportInLocalStorage(reportId, updates)
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating report:', error)
    return updateReportInLocalStorage(reportId, updates)
  }
}

// Delete a report
export async function deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const { error } = await supabase
      .from('saved_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', currentUser.id)

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return deleteReportFromLocalStorage(reportId)
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting report:', error)
    return deleteReportFromLocalStorage(reportId)
  }
}

// Update last run timestamp
export async function updateReportLastRun(reportId: string): Promise<void> {
  if (!supabase) return

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) return

    await supabase
      .from('saved_reports')
      .update({ last_run: new Date().toISOString() })
      .eq('id', reportId)
      .eq('user_id', currentUser.id)
  } catch (error) {
    // Silently fail - not critical
    console.warn('Error updating report last run:', error)
  }
}

// LocalStorage fallback functions
function saveReportToLocalStorage(report: {
  name: string
  description?: string
  type: 'dashboard' | 'report' | 'visualization'
  dateRange: string
  chartType: string
  selectedFields: string[]
  filters?: Record<string, string>
  schedule?: 'daily' | 'weekly' | 'monthly' | null
}): { success: boolean; id?: string; error?: string } {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const reports = getReportsFromLocalStorage()
    const newReport: SavedReport = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: report.name,
      description: report.description,
      type: report.type,
      dateRange: report.dateRange,
      chartType: report.chartType,
      selectedFields: report.selectedFields,
      filters: report.filters,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      schedule: report.schedule,
    }

    reports.push(newReport)
    localStorage.setItem('saved_reports', JSON.stringify(reports))
    return { success: true, id: newReport.id }
  } catch (error) {
    return { success: false, error: 'Failed to save report' }
  }
}

function updateReportInLocalStorage(
  reportId: string,
  updates: Partial<SavedReport>
): { success: boolean; error?: string } {
  try {
    const reports = getReportsFromLocalStorage()
    const index = reports.findIndex(r => r.id === reportId)
    if (index === -1) {
      return { success: false, error: 'Report not found' }
    }

    reports[index] = {
      ...reports[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }

    localStorage.setItem('saved_reports', JSON.stringify(reports))
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update report' }
  }
}

function deleteReportFromLocalStorage(reportId: string): { success: boolean; error?: string } {
  try {
    const reports = getReportsFromLocalStorage()
    const filtered = reports.filter(r => r.id !== reportId)
    localStorage.setItem('saved_reports', JSON.stringify(filtered))
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete report' }
  }
}

function getReportsFromLocalStorage(): SavedReport[] {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) return []

    const stored = localStorage.getItem('saved_reports')
    if (!stored) return []

    const reports: SavedReport[] = JSON.parse(stored)
    // Filter to only current user's reports
    return reports.filter(r => r.created_by === currentUser.id)
  } catch (error) {
    return []
  }
}

