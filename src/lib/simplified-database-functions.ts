// Temporary Performance Fix - Disable Complex Optimizations
// This file temporarily disables some performance optimizations to fix loading issues

import { supabase } from './supabase'
import type { Project, Task, TaskWithDetails, ProjectWithDetails, User, Company, Form, FormField, FormSubmission, Service, ServiceWithCompanyStatus, InternalUserCompany, UserWithCompanies, UserInvitation } from './supabase'
import { getCurrentUser } from './auth'

// Helper function to set application context for RLS
async function setAppContext() {
  if (!supabase) return
  
  const currentUser = getCurrentUser()
  if (currentUser) {
    try {
      await supabase.rpc('set_user_context', {
        user_id: currentUser.id,
        user_role: currentUser.role,
        company_id: currentUser.companyId || null
      })
    } catch (error) {
      console.warn('set_user_context RPC function not available, falling back to basic auth')
      // Don't throw error, just continue without setting context
    }
  }
}

// Simplified Project Management Functions (no caching for now)

export async function fetchProjectsOptimized(companyId?: string): Promise<ProjectWithDetails[]> {
  if (!supabase) return []

  try {
    await setAppContext()
    let query = supabase
      .from('projects')
      .select(`
        *,
        created_user:users!projects_created_by_fkey(id, full_name, email),
        manager:users!projects_manager_id_fkey(id, full_name, email),
        tasks:tasks(id, status),
        project_managers!project_managers_project_id_fkey(
          user_id,
          role,
          user:users!project_managers_user_id_fkey(id, full_name, email)
        ),
        project_members!project_members_project_id_fkey(
          user_id,
          role,
          user:users!project_members_user_id_fkey(id, full_name, email)
        )
      `)
      .order('created_at', { ascending: false })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) return []

    const transformedData = data?.map(project => ({
      ...project,
      task_count: project.tasks?.length || 0,
      managers: project.project_managers?.map((pm: { user_id: string; role: string; user: User }) => ({
        id: pm.user_id,
        role: pm.role,
        user: pm.user
      })) || [],
      members: project.project_members?.map((pm: { user_id: string; role: string; user: User }) => ({
        id: pm.user_id,
        role: pm.role,
        user: pm.user
      })) || []
    })) || []
    
    return transformedData
  } catch (error) {
    console.error('Error fetching projects:', error)
    return []
  }
}

export async function deleteProjectOptimized(projectId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    // First, delete all tasks associated with the project
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('project_id', projectId)

    if (tasksError) {
      return { success: false, error: `Failed to delete project tasks: ${tasksError.message}` }
    }


    // Finally, delete the project itself
    const { error: projectError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (projectError) {
      return { success: false, error: `Failed to delete project: ${projectError.message}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while deleting project' }
  }
}

export async function fetchTasksOptimized(projectId?: string): Promise<TaskWithDetails[]> {
  if (!supabase) return []

  try {
    await setAppContext()
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, full_name, email),
        created_user:users!tasks_created_by_fkey(id, full_name, email),
        task_comments(id),
        task_assignments!task_assignments_task_id_fkey(
          user_id,
          user:users!task_assignments_user_id_fkey(id, full_name, email)
        )
      `)
      .order('position', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) return []

    const transformedData = data?.map(task => ({
      ...task,
      comment_count: task.task_comments?.length || 0,
      // Use the first assigned user from task_assignments if available, otherwise fall back to assigned_user
      assigned_user: task.task_assignments?.[0]?.user || task.assigned_user
    })) || []
    
    return transformedData
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
}

export async function fetchUsersOptimized(): Promise<User[]> {
  if (!supabase) return []

  try {
    await setAppContext()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('full_name', { ascending: true })

    if (error) return []
    return data || []
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

export async function fetchCompaniesOptimized(): Promise<Company[]> {
  if (!supabase) return []

  try {
    await setAppContext()
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true })

    if (error) return []
    return data || []
  } catch (error) {
    console.error('Error fetching companies:', error)
    return []
  }
}

export async function fetchServicesOptimized(): Promise<Service[]> {
  if (!supabase) return []

  try {
    await setAppContext()
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name', { ascending: true })

    if (error) return []
    return data || []
  } catch (error) {
    console.error('Error fetching services:', error)
    return []
  }
}

export async function fetchFormsOptimized(): Promise<Form[]> {
  if (!supabase) return []

  try {
    await setAppContext()
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .order('title', { ascending: true })

    if (error) return []
    return data || []
  } catch (error) {
    console.error('Error fetching forms:', error)
    return []
  }
}

// Simplified dashboard data loading
export async function loadDashboardData(userRole: string, companyId?: string) {
  const results: {
    projects: ProjectWithDetails[]
    users: User[]
    companies?: Company[]
    services?: Service[]
  } = {
    projects: await fetchProjectsOptimized(companyId),
    users: await fetchUsersOptimized()
  }

  if (userRole === 'admin') {
    results.companies = await fetchCompaniesOptimized()
    results.services = await fetchServicesOptimized()
  }

  return results
}

// Simplified subscription management (disabled for now)
export function subscribeToTasksOptimized(projectId: string, callback: (tasks: TaskWithDetails[]) => void) {
  // Temporarily disabled to fix performance issues
  console.warn('Real-time subscriptions temporarily disabled for performance')
  return {
    unsubscribe: () => {
      console.warn('Subscription cleanup not needed - subscriptions disabled')
    }
  }
}

export function subscribeToProjectsOptimized(callback: (projects: ProjectWithDetails[]) => void) {
  // Temporarily disabled to fix performance issues
  console.warn('Real-time subscriptions temporarily disabled for performance')
  return {
    unsubscribe: () => {
      console.warn('Subscription cleanup not needed - subscriptions disabled')
    }
  }
}

export function cleanupSubscriptions() {
  // Temporarily disabled
  console.warn('Subscription cleanup temporarily disabled')
}

export function invalidateProjectCache() {
  // Temporarily disabled
  console.warn('Cache invalidation temporarily disabled')
}

// Export other functions that might be needed
export * from './database-functions'

// Add missing functions that are called from projects tab
export async function updateTaskPosition(taskId: string, position: number, status: Task['status'], userId: string) {
  if (!supabase) return

  try {
    await setAppContext()
    const { error } = await supabase
      .from('tasks')
      .update({ position, status })
      .eq('id', taskId)

    if (error) {
      console.error('Error updating task position:', error)
      throw error
    }
  } catch (error) {
    console.error('Error updating task position:', error)
    throw error
  }
}

export async function testDatabaseConnection() {
  if (!supabase) return false
  
  try {
    await setAppContext()
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Database connection test failed:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}
