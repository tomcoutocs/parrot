// Optimized Database Functions
// This module provides optimized versions of database functions with caching, deduplication, and performance improvements

import { supabase } from './supabase'
import type { Project, Task, TaskWithDetails, ProjectWithDetails, User, Company, Form, FormField, FormSubmission, Service, ServiceWithCompanyStatus, InternalUserCompany, UserWithCompanies, UserInvitation } from './supabase'
import { getCurrentUser } from './auth'
import { 
  optimizedFetch, 
  batchFetch, 
  invalidateCache, 
  subscriptionManager,
  debounce,
  throttle,
  activityTracker
} from './performance-optimizations'

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
      // RPC function not available, falling back to basic auth
    }
  }
}

// Optimized Project Management Functions

export async function fetchProjectsOptimized(companyId?: string): Promise<ProjectWithDetails[]> {
  return optimizedFetch(
    'fetchProjects',
    { companyId },
    async () => {
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
          .neq('status', 'archived')
          .order('position', { ascending: true })
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
        // Track error
        activityTracker.addEvent({
          type: 'error',
          description: `Error fetching projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
          metadata: { operation: 'fetchProjects', error: error instanceof Error ? error.message : 'Unknown error' }
        })
        return []
      }
    },
    `projects:${companyId || 'all'}`,
    2 * 60 * 1000 // 2 minutes cache for projects
  )
}

export async function fetchTasksOptimized(projectId?: string): Promise<TaskWithDetails[]> {
  return optimizedFetch(
    'fetchTasks',
    { projectId },
    async () => {
      if (!supabase) return []

      try {
        await setAppContext()
        let query = supabase
          .from('tasks')
          .select(`
            *,
            assigned_user:users!tasks_assigned_to_fkey(id, full_name, email),
            created_user:users!tasks_created_by_fkey(id, full_name, email),
            task_comments(id)
          `)
          .order('position', { ascending: true })

        if (projectId) {
          query = query.eq('project_id', projectId)
        }

        const { data, error } = await query

        if (error) return []

        const transformedData = data?.map(task => ({
          ...task,
          comment_count: task.task_comments?.length || 0
        })) || []
        
        return transformedData
      } catch (error) {
        return []
      }
    },
    `tasks:${projectId || 'all'}`,
    1 * 60 * 1000 // 1 minute cache for tasks
  )
}

export async function fetchUsersOptimized(): Promise<User[]> {
  return optimizedFetch(
    'fetchUsers',
    {},
    async () => {
      if (!supabase) return []

      try {
        const resultWithPermissions = await supabase
          .from('users')
          .select('id, email, full_name, role, created_at, updated_at, is_active, assigned_manager_id, company_id, tab_permissions')
          .eq('is_active', true)
          .order('full_name', { ascending: true })
        
        if (resultWithPermissions.error) {
          const resultWithoutPermissions = await supabase
            .from('users')
            .select('id, email, full_name, role, created_at, updated_at, is_active, assigned_manager_id, company_id')
            .eq('is_active', true)
            .order('full_name', { ascending: true })
          
          if (resultWithoutPermissions.error) return []

          const users = (resultWithoutPermissions.data || []).map(user => ({
            ...user,
            tab_permissions: []
          }))
          
          return users
        }

        const users = (resultWithPermissions.data || []).map(user => ({
          ...user,
          tab_permissions: user.tab_permissions || []
        }))
        
        return users
      } catch (error) {
        return []
      }
    },
    'users:all',
    5 * 60 * 1000 // 5 minutes cache for users
  )
}

export async function fetchCompaniesOptimized(): Promise<Company[]> {
  return optimizedFetch(
    'fetchCompanies',
    {},
    async () => {
      if (!supabase) return []

      try {
        await setAppContext()
        
        let { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (error && error.message.includes('column "is_active" does not exist')) {
          const result = await supabase
            .from('companies')
            .select('*')
            .order('name', { ascending: true })
          
          data = result.data
          error = result.error
        }

        if (error) return []

        return data || []
      } catch (error) {
        return []
      }
    },
    'companies:all',
    3 * 60 * 1000 // 3 minutes cache for companies
  )
}

export async function fetchServicesOptimized(): Promise<Service[]> {
  return optimizedFetch(
    'fetchServices',
    {},
    async () => {
      if (!supabase) return []

      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true })

        if (error) return []

        return data || []
      } catch (error) {
        return []
      }
    },
    'services:all',
    10 * 60 * 1000 // 10 minutes cache for services
  )
}

export async function fetchFormsOptimized(): Promise<Form[]> {
  return optimizedFetch(
    'fetchForms',
    {},
    async () => {
      if (!supabase) return []

      try {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) return []

        return data || []
      } catch (error) {
        return []
      }
    },
    'forms:all',
    5 * 60 * 1000 // 5 minutes cache for forms
  )
}

// Batch loading functions for dashboard initialization
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

  // Add role-specific operations
  if (userRole === 'admin') {
    results.companies = await fetchCompaniesOptimized()
    results.services = await fetchServicesOptimized()
  }

  return results
}

// Optimized real-time subscriptions
export function subscribeToTasksOptimized(projectId: string, callback: (tasks: TaskWithDetails[]) => void) {
  const channelName = `tasks-${projectId}`
  
  const subscription = subscriptionManager.subscribe(channelName, async () => {
    // Invalidate cache for this project's tasks
    invalidateCache(`tasks:${projectId}`)
    
    // Fetch updated tasks
    const tasks = await fetchTasksOptimized(projectId)
    callback(tasks)
  })
  
  return subscription
}

export function subscribeToProjectsOptimized(callback: (projects: ProjectWithDetails[]) => void) {
  const channelName = 'projects'
  
  const subscription = subscriptionManager.subscribe(channelName, async () => {
    // Invalidate cache for projects
    invalidateCache('projects:')
    
    // Fetch updated projects
    const projects = await fetchProjectsOptimized()
    callback(projects)
  })
  
  return subscription
}

// Cache invalidation helpers
export function invalidateProjectCache(projectId?: string) {
  if (projectId) {
    invalidateCache(`projects:${projectId}`)
    invalidateCache(`tasks:${projectId}`)
  } else {
    invalidateCache('projects:')
    invalidateCache('tasks:')
  }
}

export function invalidateUserCache() {
  invalidateCache('users:')
}

export function invalidateCompanyCache() {
  invalidateCache('companies:')
}

export function invalidateServiceCache() {
  invalidateCache('services:')
}

export function invalidateFormCache() {
  invalidateCache('forms:')
}

// Performance monitoring for database operations
export function getDatabasePerformanceMetrics() {
  return {
    activeSubscriptions: subscriptionManager.getActiveSubscriptions(),
    subscriptionCount: subscriptionManager.getActiveSubscriptions().length
  }
}

// Cleanup function for component unmounting
export function cleanupSubscriptions() {
  subscriptionManager.unsubscribeAll()
}

// Task management functions
export async function updateTaskPosition(taskId: string, newPosition: number, newStatus: Task['status'], userId: string): Promise<boolean> {
  // Track user action
  activityTracker.addEvent({
    type: 'user_action',
    description: `Task moved: ${taskId} to ${newStatus}`,
    metadata: { taskId, newPosition, newStatus, userId }
  })

  return optimizedFetch(
    'updateTaskPosition',
    { taskId, newPosition, newStatus, userId },
    async () => {
      if (!supabase) {
        return false
      }

      try {
        // Get current task data
        const { data: currentTask } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single()

        if (!currentTask) {
          return false
        }

        // Update task position and status
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ 
            position: newPosition,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId)

        if (updateError) {
          return false
        }

        // Log activity
        await supabase
          .from('task_activities')
          .insert({
            task_id: taskId,
            user_id: userId,
            action: 'moved',
            old_value: { position: currentTask.position, status: currentTask.status },
            new_value: { position: newPosition, status: newStatus }
          })

        // Invalidate cache for this project's tasks
        invalidateCache(`tasks:${currentTask.project_id}`)

        return true
      } catch (error) {
        return false
      }
    },
    `task-position-${taskId}`,
    0 // No cache for updates
  )
}

export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  // Track user action
  activityTracker.addEvent({
    type: 'user_action',
    description: `Task deleted: ${taskId}`,
    metadata: { taskId }
  })

  return optimizedFetch(
    'deleteTask',
    { taskId },
    async () => {
      if (!supabase) {
        return { success: false, error: 'Supabase not configured' }
      }

      try {
        
        // Get task info for cache invalidation
        const { data: task } = await supabase
          .from('tasks')
          .select('project_id')
          .eq('id', taskId)
          .single()
        
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)

        if (error) {
          return { success: false, error: error.message || 'Failed to delete task' }
        }

        // Invalidate cache for this project's tasks
        if (task?.project_id) {
          invalidateCache(`tasks:${task.project_id}`)
          invalidateCache(`projects:${task.project_id}`)
        }
        return { success: true }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
      }
    },
    `task-delete-${taskId}`,
    0 // No cache for deletes
  )
}

// Database setup and connection testing functions
export async function checkDatabaseSetup(): Promise<{ 
  usersTableExists: boolean
  companiesTableExists: boolean
  companyIdColumnExists: boolean
  connectionWorking: boolean
  error?: string 
}> {
  return optimizedFetch(
    'checkDatabaseSetup',
    {},
    async () => {
      if (!supabase) {
        return {
          usersTableExists: false,
          companiesTableExists: false,
          companyIdColumnExists: false,
          connectionWorking: false,
          error: 'Supabase not configured'
        }
      }

      try {
        await setAppContext()
        
        // Test connection by trying to fetch a single user
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id')
          .limit(1)

        if (usersError) {
          return {
            usersTableExists: false,
            companiesTableExists: false,
            companyIdColumnExists: false,
            connectionWorking: false,
            error: usersError.message
          }
        }

        // Check if companies table exists
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('id')
          .limit(1)

        if (companiesError) {
          return {
            usersTableExists: true,
            companiesTableExists: false,
            companyIdColumnExists: false,
            connectionWorking: true,
            error: companiesError.message
          }
        }

        // Check if company_id column exists in users table
        const { data: usersWithCompany, error: companyIdError } = await supabase
          .from('users')
          .select('company_id')
          .limit(1)

        if (companyIdError) {
          return {
            usersTableExists: true,
            companiesTableExists: true,
            companyIdColumnExists: false,
            connectionWorking: true,
            error: companyIdError.message
          }
        }

        return {
          usersTableExists: true,
          companiesTableExists: true,
          companyIdColumnExists: true,
          connectionWorking: true
        }
      } catch (error) {
        return {
          usersTableExists: false,
          companiesTableExists: false,
          companyIdColumnExists: false,
          connectionWorking: false,
          error: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }
    },
    'database-setup-check',
    10 * 60 * 1000 // 10 minutes cache for setup check
  )
}

export async function testDatabaseConnection(): Promise<void> {
  return optimizedFetch(
    'testDatabaseConnection',
    {},
    async () => {
      if (!supabase) {
        return
      }

      try {
        // Test if tables exist (silent check)
        await supabase
          .from('projects')
          .select('count')
          .limit(1)
        
        await supabase
          .from('tasks')
          .select('count')
          .limit(1)
        
        await supabase
          .from('users')
          .select('count')
          .limit(1)
        
        await supabase
          .from('project_managers')
          .select('count')
          .limit(1)
        
        await supabase
          .from('project_members')
          .select('count')
          .limit(1)
        
      } catch (error) {
        // Connection test failed silently
      }
    },
    'database-connection-test',
    5 * 60 * 1000 // 5 minutes cache for connection test
  )
}

// Export all optimized functions
export {
  fetchProjectsOptimized as fetchProjects,
  fetchTasksOptimized as fetchTasks,
  fetchUsersOptimized as fetchUsers,
  fetchCompaniesOptimized as fetchCompanies,
  fetchServicesOptimized as fetchServices,
  fetchFormsOptimized as fetchForms,
  subscribeToTasksOptimized as subscribeToTasks,
  subscribeToProjectsOptimized as subscribeToProjects
}
