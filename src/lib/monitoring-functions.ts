// Real-time monitoring functions for system admin
import { supabase } from './supabase'
import { getCurrentUser } from './auth'

export interface SystemHealthMetrics {
  database: {
    status: 'operational' | 'degraded' | 'down'
    responseTime: number
    connectionCount: number
    errorCount: number
  }
  server: {
    status: 'operational' | 'degraded' | 'down'
    uptime: number
  }
  api: {
    status: 'operational' | 'degraded' | 'down'
    responseTime: number
    errorRate: number
  }
}

export interface RealTimeMetrics {
  totalUsers: number
  activeUsers: number
  totalProjects: number
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  totalSpaces: number
  totalSupportTickets: number
  openSupportTickets: number
  totalInvoices: number
  totalRevenue: number
  databaseSize: number
  recentErrors: number
  recentWarnings: number
}

export interface SystemLog {
  id: string
  level: 'error' | 'warning' | 'info' | 'success'
  message: string
  source: string
  timestamp: string
  metadata?: any
  user_id?: string
}

/**
 * Get real-time system metrics
 */
export async function getRealTimeMetrics(): Promise<{ success: boolean; data?: RealTimeMetrics; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Set user context
    try {
      await supabase.rpc('set_user_context', {
        user_id: currentUser.id,
        user_role: currentUser.role,
        company_id: currentUser.companyId || null
      })
    } catch (error) {
      // Silent error handling
    }

    // Fetch all metrics in parallel
    const [
      usersResult,
      projectsResult,
      tasksResult,
      spacesResult,
      ticketsResult,
      invoicesResult,
      paymentsResult,
      activityLogsResult
    ] = await Promise.all([
      // Users
      supabase.from('users').select('id, is_active, last_login_at', { count: 'exact' }),
      // Projects
      supabase.from('projects').select('id', { count: 'exact' }),
      // Tasks
      supabase.from('tasks').select('id, status, due_date', { count: 'exact' }),
      // Spaces
      supabase.from('spaces').select('id', { count: 'exact' }),
      // Support tickets
      supabase.from('support_tickets').select('id, status', { count: 'exact' }),
      // Invoices
      supabase.from('invoices').select('id, total_amount, status', { count: 'exact' }),
      // Payments
      supabase.from('payments').select('id, amount', { count: 'exact' }),
      // Activity logs (for errors/warnings)
      supabase
        .from('activity_logs')
        .select('id, action_type, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1000)
    ])

    // Calculate metrics
    const totalUsers = usersResult.count || 0
    const activeUsers = usersResult.data?.filter(u => {
      if (!u.is_active) return false
      if (!u.last_login_at) return false
      const lastLogin = new Date(u.last_login_at)
      const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceLogin <= 30 // Active if logged in within last 30 days
    }).length || 0

    const totalProjects = projectsResult.count || 0
    const totalTasks = tasksResult.count || 0
    const completedTasks = tasksResult.data?.filter(t => t.status === 'completed').length || 0
    const overdueTasks = tasksResult.data?.filter(t => {
      if (t.status === 'completed') return false
      if (!t.due_date) return false
      return new Date(t.due_date) < new Date()
    }).length || 0

    const totalSpaces = spacesResult.count || 0
    const totalSupportTickets = ticketsResult.count || 0
    const openSupportTickets = ticketsResult.data?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0

    const totalInvoices = invoicesResult.count || 0
    const totalRevenue = paymentsResult.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Count errors and warnings from activity logs
    const recentErrors = activityLogsResult.data?.filter(log => 
      log.action_type?.toLowerCase().includes('error') || 
      log.action_type?.toLowerCase().includes('failed')
    ).length || 0

    const recentWarnings = activityLogsResult.data?.filter(log => 
      log.action_type?.toLowerCase().includes('warning') || 
      log.action_type?.toLowerCase().includes('timeout')
    ).length || 0

    // Get database size (approximate)
    const databaseSize = 0 // Would need a database query for actual size

    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalProjects,
        totalTasks,
        completedTasks,
        overdueTasks,
        totalSpaces,
        totalSupportTickets,
        openSupportTickets,
        totalInvoices,
        totalRevenue,
        databaseSize,
        recentErrors,
        recentWarnings
      }
    }
  } catch (error) {
    console.error('Error fetching real-time metrics:', error)
    return { success: false, error: 'Failed to fetch metrics' }
  }
}

/**
 * Get system health status
 */
export async function getSystemHealth(): Promise<{ success: boolean; data?: SystemHealthMetrics; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const startTime = Date.now()
    
    // Test database connection
    const { error: dbError } = await supabase.from('users').select('id').limit(1)
    const dbResponseTime = Date.now() - startTime

    // Determine database status
    let dbStatus: 'operational' | 'degraded' | 'down' = 'operational'
    if (dbError) {
      dbStatus = 'down'
    } else if (dbResponseTime > 1000) {
      dbStatus = 'degraded'
    }

    // Get connection count (approximate from recent activity)
    const { count: connectionCount } = await supabase
      .from('activity_logs')
      .select('user_id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())

    // Count recent errors
    const { count: errorCount } = await supabase
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .or('action_type.ilike.%error%,action_type.ilike.%failed%')

    return {
      success: true,
      data: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime,
          connectionCount: connectionCount || 0,
          errorCount: errorCount || 0
        },
        server: {
          status: 'operational', // Would need server-side monitoring
          uptime: 0 // Would need server-side monitoring
        },
        api: {
          status: dbStatus === 'down' ? 'down' : 'operational',
          responseTime: dbResponseTime,
          errorRate: errorCount ? (errorCount / (connectionCount || 1)) * 100 : 0
        }
      }
    }
  } catch (error) {
    console.error('Error fetching system health:', error)
    return { success: false, error: 'Failed to fetch system health' }
  }
}

/**
 * Get system logs from activity_logs and support_tickets
 */
export async function getSystemLogs(
  limit: number = 100,
  level?: 'error' | 'warning' | 'info' | 'success'
): Promise<{ success: boolean; data?: SystemLog[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Set user context
    try {
      await supabase.rpc('set_user_context', {
        user_id: currentUser.id,
        user_role: currentUser.role,
        company_id: currentUser.companyId || null
      })
    } catch (error) {
      // Silent error handling
    }

    const logs: SystemLog[] = []

    // Fetch activity logs
    let activityQuery = supabase
      .from('activity_logs')
      .select('id, action_type, description, created_at, user_id, metadata')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (level === 'error') {
      activityQuery = activityQuery.or('action_type.ilike.%error%,action_type.ilike.%failed%')
    } else if (level === 'warning') {
      activityQuery = activityQuery.or('action_type.ilike.%warning%,action_type.ilike.%timeout%')
    }

    const { data: activityLogs, error: activityError } = await activityQuery

    if (!activityError && activityLogs) {
      activityLogs.forEach(log => {
        const logLevel: 'error' | 'warning' | 'info' | 'success' = 
          log.action_type?.toLowerCase().includes('error') || log.action_type?.toLowerCase().includes('failed')
            ? 'error'
            : log.action_type?.toLowerCase().includes('warning') || log.action_type?.toLowerCase().includes('timeout')
            ? 'warning'
            : log.action_type?.toLowerCase().includes('success') || log.action_type?.toLowerCase().includes('completed')
            ? 'success'
            : 'info'

        logs.push({
          id: log.id,
          level: logLevel,
          message: log.description || log.action_type || 'Unknown action',
          source: 'system',
          timestamp: log.created_at,
          metadata: log.metadata,
          user_id: log.user_id
        })
      })
    }

    // Fetch support tickets as logs (errors/issues)
    if (level === 'error' || !level) {
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, subject, description, priority, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(limit / 2)

      if (!ticketsError && tickets) {
        tickets.forEach(ticket => {
          const ticketLevel: 'error' | 'warning' | 'info' = 
            ticket.priority === 'urgent' || ticket.priority === 'high'
              ? 'error'
              : ticket.priority === 'normal'
              ? 'warning'
              : 'info'

          logs.push({
            id: ticket.id,
            level: ticketLevel,
            message: `Support Ticket: ${ticket.subject}`,
            source: 'support',
            timestamp: ticket.created_at,
            metadata: { priority: ticket.priority, status: ticket.status },
            user_id: ticket.user_id
          })
        })
      }
    }

    // Sort by timestamp and limit
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return { success: true, data: logs.slice(0, limit) }
  } catch (error) {
    console.error('Error fetching system logs:', error)
    return { success: false, error: 'Failed to fetch system logs' }
  }
}

