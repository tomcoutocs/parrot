import { supabase } from './supabase'
import { fetchUsers, fetchProjects, fetchTasks, fetchFormSubmissions, fetchRecentActivities } from './database-functions'

export interface AnalyticsStats {
  totalUsers: number
  activeUsers: number
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  formSubmissions: number
  activityCount: number
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

export async function getAnalyticsStats(dateRange?: { from: Date; to: Date }): Promise<AnalyticsStats> {
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
      userGrowth: [],
      projectStatusBreakdown: [],
      taskStatusBreakdown: [],
      recentActivities: [],
    }
  }

  try {
    // Fetch all data in parallel
    // Note: fetchUsers, fetchProjects, fetchTasks, and fetchRecentActivities
    // already call setAppContext internally
    const [users, projects, tasks, activities] = await Promise.all([
      fetchUsers(),
      fetchProjects(),
      fetchTasks(),
      fetchRecentActivities(50, 30), // Last 30 days
    ])

    // Calculate date range (default to last 30 days)
    const to = dateRange?.to || new Date()
    const from = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Filter active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const activeUsers = users.filter(user => {
      const updatedAt = user.updated_at ? new Date(user.updated_at) : null
      return updatedAt && updatedAt >= thirtyDaysAgo
    }).length

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

