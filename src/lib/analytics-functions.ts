import { supabase } from './supabase'
import { fetchUsers, fetchProjects, fetchTasks, fetchFormSubmissions, fetchRecentActivities } from './database-functions'
import { getInvoices } from './invoicing-functions'
import { getPayments } from './payment-functions'
import { getClients } from './client-functions'
import { getExpenses } from './expense-functions'

export interface AnalyticsStats {
  totalUsers: number
  activeUsers: number
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  formSubmissions: number
  activityCount: number
  // Billing metrics
  totalInvoices: number
  totalRevenue: number
  totalPayments: number
  totalClients: number
  totalExpenses: number
  paidInvoices: number
  outstandingInvoices: number
  invoiceStatusBreakdown: Array<{ status: string; count: number }>
  paymentStatusBreakdown: Array<{ status: string; count: number }>
  revenueByMonth: Array<{ month: string; revenue: number }>
  userGrowth: Array<{ date: string; count: number }>
  projectStatusBreakdown: Array<{ status: string; count: number }>
  taskStatusBreakdown: Array<{ status: string; count: number }>
  recentActivities: Array<{
    id: string
    description: string
    created_at: string
    user?: { full_name: string; email: string }
  }>
}

export async function getAnalyticsStats(
  dateRange?: { from: Date; to: Date },
  spaceId?: string,
  userId?: string
): Promise<AnalyticsStats> {
  if (!supabase) {
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalProjects: 0,
      activeProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      formSubmissions: 0,
      activityCount: 0,
      totalInvoices: 0,
      totalRevenue: 0,
      totalPayments: 0,
      totalClients: 0,
      totalExpenses: 0,
      paidInvoices: 0,
      outstandingInvoices: 0,
      invoiceStatusBreakdown: [],
      paymentStatusBreakdown: [],
      revenueByMonth: [],
      userGrowth: [],
      projectStatusBreakdown: [],
      taskStatusBreakdown: [],
      recentActivities: [],
    }
  }

  try {
    // Calculate date range (default to last 30 days)
    const to = dateRange?.to || new Date()
    const from = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Fetch all data in parallel with filters
    // Note: fetchUsers, fetchProjects, fetchTasks, and fetchRecentActivities
    // already call setAppContext internally
    const [usersData, projectsData, tasksData, activitiesData, invoicesResult, paymentsResult, clientsResult, expensesResult] = await Promise.all([
      fetchUsers(),
      fetchProjects(spaceId),
      fetchTasks(), // fetchTasks doesn't accept spaceId, we'll filter manually
      fetchRecentActivities(50, 30), // Last 30 days
      getInvoices(spaceId),
      getPayments(spaceId),
      getClients(spaceId),
      getExpenses(spaceId),
    ])

    // Filter users if userId is specified
    let users = usersData
    if (userId) {
      users = users.filter(u => u.id === userId)
    }

    // Filter projects by space if spaceId is specified (already filtered in fetchProjects)
    let projects = projectsData

    // Filter tasks by space and user if specified
    let tasks = tasksData
    if (spaceId) {
      tasks = tasks.filter(t => {
        // Check both space_id and company_id for backward compatibility
        const taskSpaceId = (t as any).space_id || (t as any).company_id
        return taskSpaceId === spaceId
      })
    }
    if (userId) {
      tasks = tasks.filter(t => {
        // Check if user is assigned to task or created it
        const taskDetails = t as any
        return taskDetails.created_by === userId || 
               (taskDetails.assignments && taskDetails.assignments.some((a: any) => a.user_id === userId))
      })
    }

    // Filter activities by user if specified
    let activities = activitiesData
    if (userId) {
      activities = activities.filter(a => a.user_id === userId)
    }

    // Extract billing data
    const invoices = invoicesResult.success ? invoicesResult.data || [] : []
    const payments = paymentsResult.success ? paymentsResult.data || [] : []
    const clients = clientsResult.success ? clientsResult.data || [] : []
    const expenses = expensesResult.success ? expensesResult.data || [] : []

    // Filter billing data by date range
    const filteredInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.created_at)
      return invDate >= from && invDate <= to
    })

    const filteredPayments = payments.filter(pay => {
      const payDate = new Date(pay.created_at)
      return payDate >= from && payDate <= to
    })

    const filteredExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.expense_date)
      return expDate >= from && expDate <= to
    })

    // Filter active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const activeUsers = users.filter(user => {
      const updatedAt = user.updated_at ? new Date(user.updated_at) : null
      return updatedAt && updatedAt >= thirtyDaysAgo
    }).length

    // Calculate billing metrics
    const totalRevenue = filteredPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    const paidInvoices = filteredInvoices.filter(inv => inv.status === 'paid').length
    const outstandingInvoices = filteredInvoices.filter(inv => 
      inv.status === 'sent' || inv.status === 'viewed' || inv.status === 'overdue'
    ).length

    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)

    // Invoice status breakdown
    const invoiceStatusBreakdown = filteredInvoices.reduce((acc, inv) => {
      const status = inv.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Payment status breakdown
    const paymentStatusBreakdown = filteredPayments.reduce((acc, pay) => {
      const status = pay.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Revenue by month
    const revenueByMonthMap = new Map<string, number>()
    filteredPayments
      .filter(p => p.status === 'completed')
      .forEach(payment => {
        const date = new Date(payment.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        revenueByMonthMap.set(monthKey, (revenueByMonthMap.get(monthKey) || 0) + (payment.amount || 0))
      })
    const revenueByMonth = Array.from(revenueByMonthMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12) // Last 12 months

    // Calculate project stats
    const activeProjects = projects.filter(p => p.status !== 'archived' && p.status !== 'completed').length
    const projectStatusBreakdown = projects.reduce((acc, project) => {
      const status = project.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate task stats
    const completedTasks = tasks.filter(t => t.status === 'done').length
    const taskStatusBreakdown = tasks.reduce((acc, task) => {
      const status = task.status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate user growth over time
    const userGrowthMap = new Map<string, number>()
    users.forEach(user => {
      if (user.created_at) {
        const date = new Date(user.created_at).toISOString().split('T')[0]
        userGrowthMap.set(date, (userGrowthMap.get(date) || 0) + 1)
      }
    })
    const userGrowth = Array.from(userGrowthMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30) // Last 30 days

    // Get form submissions count (approximate from activities)
    const formSubmissionActivities = activities.filter(
      a => a.type === 'form_submitted' || a.description?.toLowerCase().includes('form')
    )

    // Format recent activities
    const recentActivities = activities.slice(0, 10).map(activity => ({
      id: activity.id,
      description: activity.description || activity.type || 'Activity',
      created_at: activity.timestamp,
      user: {
        full_name: activity.user_name || '',
        email: activity.user_email || '',
      },
    }))

    return {
      totalUsers: users.length,
      activeUsers,
      totalProjects: projects.length,
      activeProjects,
      totalTasks: tasks.length,
      completedTasks,
      formSubmissions: formSubmissionActivities.length,
      activityCount: activities.length,
      // Billing metrics
      totalInvoices: filteredInvoices.length,
      totalRevenue,
      totalPayments: filteredPayments.length,
      totalClients: clients.length,
      totalExpenses,
      paidInvoices,
      outstandingInvoices,
      invoiceStatusBreakdown: Object.entries(invoiceStatusBreakdown).map(([status, count]) => ({
        status,
        count,
      })),
      paymentStatusBreakdown: Object.entries(paymentStatusBreakdown).map(([status, count]) => ({
        status,
        count,
      })),
      revenueByMonth,
      userGrowth,
      projectStatusBreakdown: Object.entries(projectStatusBreakdown).map(([status, count]) => ({
        status,
        count,
      })),
      taskStatusBreakdown: Object.entries(taskStatusBreakdown).map(([status, count]) => ({
        status,
        count,
      })),
      recentActivities,
    }
  } catch (error) {
    console.error('Error fetching analytics stats:', error)
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalProjects: 0,
      activeProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      formSubmissions: 0,
      activityCount: 0,
      totalInvoices: 0,
      totalRevenue: 0,
      totalPayments: 0,
      totalClients: 0,
      totalExpenses: 0,
      paidInvoices: 0,
      outstandingInvoices: 0,
      invoiceStatusBreakdown: [],
      paymentStatusBreakdown: [],
      revenueByMonth: [],
      userGrowth: [],
      projectStatusBreakdown: [],
      taskStatusBreakdown: [],
      recentActivities: [],
    }
  }
}

export async function getFormSubmissionsStats(): Promise<{
  total: number
  byForm: Array<{ formId: string; formName: string; count: number }>
  recent: Array<{ id: string; formName: string; submittedAt: string; userName: string }>
}> {
  if (!supabase) {
    return { total: 0, byForm: [], recent: [] }
  }

  try {
    // Fetch all forms to get names
    const { data: forms } = await supabase
      .from('forms')
      .select('id, title')

    const formMap = new Map<string, string>()
    forms?.forEach(form => {
      formMap.set(form.id, form.title)
    })

    // Fetch form submissions
    const { data: submissions } = await supabase
      .from('form_submissions')
      .select('id, form_id, submitted_at, user:users!form_submissions_user_id_fkey(full_name, email)')
      .order('submitted_at', { ascending: false })
      .limit(100)

    // Count by form
    const byFormMap = new Map<string, number>()
    submissions?.forEach(sub => {
      const count = byFormMap.get(sub.form_id) || 0
      byFormMap.set(sub.form_id, count + 1)
    })

    const byForm = Array.from(byFormMap.entries()).map(([formId, count]) => ({
      formId,
      formName: formMap.get(formId) || 'Unknown Form',
      count,
    }))

    const recent = (submissions || []).slice(0, 10).map(sub => ({
      id: sub.id,
      formName: formMap.get(sub.form_id) || 'Unknown Form',
      submittedAt: sub.submitted_at,
      userName: (sub.user as any)?.full_name || (sub.user as any)?.email || 'Unknown',
    }))

    return {
      total: submissions?.length || 0,
      byForm,
      recent,
    }
  } catch (error) {
    console.error('Error fetching form submissions stats:', error)
    return { total: 0, byForm: [], recent: [] }
  }
}

// Get tracking data for reports
export async function getTrackingData(dateRange?: { from: Date; to: Date }): Promise<{
  pageViews: Array<{ date: string; count: number; path: string }>
  userBehaviors: Array<{ type: string; count: number; date: string }>
  sessions: Array<{ date: string; count: number; avgDuration: number }>
  devices: Array<{ device: string; count: number }>
  browsers: Array<{ browser: string; count: number }>
}> {
  if (!supabase) {
    return {
      pageViews: [],
      userBehaviors: [],
      sessions: [],
      devices: [],
      browsers: [],
    }
  }

  try {
    const to = dateRange?.to || new Date()
    const from = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Fetch page views
    const { data: pageViews } = await supabase
      .from('analytics_page_views')
      .select('view_timestamp, page_path')
      .gte('view_timestamp', from.toISOString())
      .lte('view_timestamp', to.toISOString())

    // Fetch user behaviors
    const { data: behaviors } = await supabase
      .from('analytics_user_behaviors')
      .select('event_type, created_at')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())

    // Fetch sessions
    const { data: sessions } = await supabase
      .from('analytics_sessions')
      .select('session_start, duration_seconds, device_type, browser')
      .gte('session_start', from.toISOString())
      .lte('session_start', to.toISOString())

    // Process page views
    const pageViewsMap = new Map<string, Map<string, number>>()
    pageViews?.forEach(view => {
      const date = new Date(view.view_timestamp).toISOString().split('T')[0]
      const path = view.page_path || 'unknown'
      if (!pageViewsMap.has(date)) {
        pageViewsMap.set(date, new Map())
      }
      const pathMap = pageViewsMap.get(date)!
      pathMap.set(path, (pathMap.get(path) || 0) + 1)
    })
    const pageViewsData = Array.from(pageViewsMap.entries()).flatMap(([date, pathMap]) =>
      Array.from(pathMap.entries()).map(([path, count]) => ({ date, count, path }))
    )

    // Process user behaviors
    const behaviorsMap = new Map<string, Map<string, number>>()
    behaviors?.forEach(behavior => {
      const date = new Date(behavior.created_at).toISOString().split('T')[0]
      const type = behavior.event_type || 'unknown'
      if (!behaviorsMap.has(date)) {
        behaviorsMap.set(date, new Map())
      }
      const typeMap = behaviorsMap.get(date)!
      typeMap.set(type, (typeMap.get(type) || 0) + 1)
    })
    const userBehaviorsData = Array.from(behaviorsMap.entries()).flatMap(([date, typeMap]) =>
      Array.from(typeMap.entries()).map(([type, count]) => ({ type, count, date }))
    )

    // Process sessions
    const sessionsMap = new Map<string, { count: number; totalDuration: number }>()
    sessions?.forEach(session => {
      const date = new Date(session.session_start).toISOString().split('T')[0]
      const existing = sessionsMap.get(date) || { count: 0, totalDuration: 0 }
      sessionsMap.set(date, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + (session.duration_seconds || 0),
      })
    })
    const sessionsData = Array.from(sessionsMap.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      avgDuration: data.count > 0 ? Math.floor(data.totalDuration / data.count) : 0,
    }))

    // Process devices
    const devicesMap = new Map<string, number>()
    sessions?.forEach(session => {
      const device = session.device_type || 'unknown'
      devicesMap.set(device, (devicesMap.get(device) || 0) + 1)
    })
    const devicesData = Array.from(devicesMap.entries()).map(([device, count]) => ({
      device,
      count,
    }))

    // Process browsers
    const browsersMap = new Map<string, number>()
    sessions?.forEach(session => {
      const browser = session.browser || 'unknown'
      browsersMap.set(browser, (browsersMap.get(browser) || 0) + 1)
    })
    const browsersData = Array.from(browsersMap.entries()).map(([browser, count]) => ({
      browser,
      count,
    }))

    return {
      pageViews: pageViewsData,
      userBehaviors: userBehaviorsData,
      sessions: sessionsData,
      devices: devicesData,
      browsers: browsersData,
    }
  } catch (error) {
    console.error('Error fetching tracking data:', error)
    return {
      pageViews: [],
      userBehaviors: [],
      sessions: [],
      devices: [],
      browsers: [],
    }
  }
}

