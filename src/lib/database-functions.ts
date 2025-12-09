import { supabase } from './supabase'
import type { Project, Task, TaskWithDetails, ProjectWithDetails, User, Space, Company, Form, FormField, FormSubmission, Service, ServiceWithSpaceStatus, ServiceWithCompanyStatus, InternalUserSpace, InternalUserCompany, UserWithSpaces, UserWithCompanies, UserInvitation } from './supabase'
import { getCurrentUser } from './auth'
import { encrypt, decrypt } from './encryption'
import { createSpaceWideNotification } from './notification-functions'

// Historical Metrics Types
export interface SystemMetrics {
  id?: string
  timestamp: string
  active_users: number
  memory_usage: number
  cpu_usage: number
  request_count: number
  disk_usage: number
  network_latency: number
  error_rate: number
  response_time: number
  cache_hits: number
  cache_misses: number
  total_requests: number
  subscription_count: number
  total_projects: number
  total_tasks: number
  completed_tasks: number
  overdue_tasks: number
  user_engagement: number
  created_at?: string
}

export interface PerformanceMetrics {
  id?: string
  timestamp: string
  cache_hits: number
  cache_misses: number
  total_requests: number
  request_deduplications: number
  subscription_count: number
  active_subscriptions: string[]
  created_at?: string
}

// Simple password hashing function (in production, use bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'parrot-salt') // Add salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Simple password verification function
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hashedInput = await hashPassword(password)
  return hashedInput === hashedPassword
}

// Helper function to set application context for RLS
async function setAppContext() {
  if (!supabase) return
  
  const currentUser = getCurrentUser()
  if (currentUser) {
    try {
      // Set user context for RLS policies
      await supabase.rpc('set_user_context', {
        user_id: currentUser.id,
        user_role: currentUser.role,
        company_id: currentUser.companyId || null
      })
    } catch (error) {
      // Silent error handling - if RPC function doesn't exist, we'll fall back
    }
  }
}

// Helper function to log activities to activity_logs table
export async function logActivity(data: {
  user_id: string
  action_type: string
  entity_type: string
  entity_id?: string
  description?: string
  metadata?: Record<string, unknown>
  company_id?: string
  project_id?: string
  task_id?: string
}): Promise<void> {
  if (!supabase) return

  try {
    await supabase
      .from('activity_logs')
      .insert({
        user_id: data.user_id,
        action_type: data.action_type,
        entity_type: data.entity_type,
        entity_id: data.entity_id || null,
        description: data.description || null,
        metadata: data.metadata || {},
        company_id: data.company_id || null,
        project_id: data.project_id || null,
        task_id: data.task_id || null,
      })
  } catch (error) {
    // Silent error handling - don't fail operations if logging fails
  }
}

// Database Functions for Project Management

export async function fetchProjects(companyId?: string): Promise<ProjectWithDetails[]> {
  if (!supabase) {
    return []
  }

  try {
    // Set application context for RLS
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

    // Filter by company if provided
    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) {
      return []
    }

    // Transform data to match our interface
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
    return []
  }
}

export async function fetchTasks(projectId?: string): Promise<TaskWithDetails[]> {
  if (!supabase) {
    return []
  }

  try {
    // Set application context for RLS
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

    if (error) {
      return []
    }

    // Transform data to match our interface
    const transformedData = data?.map(task => ({
      ...task,
      // Map 'medium' priority to 'normal' for display consistency
      priority: task.priority === 'medium' ? 'normal' : task.priority,
      comment_count: task.task_comments?.length || 0
    })) || []
    
    return transformedData
  } catch (error) {
    return []
  }
}

export async function updateTaskStatus(taskId: string, newStatus: Task['status'], userId: string): Promise<boolean> {
  if (!supabase) {
    return false
  }

  try {
    // Get current task data for activity log
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (!currentTask) {
      return false
    }

    // Update task status
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)

    if (updateError) {
      return false
    }

    // Log activity to activity_logs
    const actionType = newStatus === 'done' ? 'task_completed' : 'task_status_changed'
    await logActivity({
      user_id: userId,
      action_type: actionType,
      entity_type: 'task',
      entity_id: taskId,
      description: newStatus === 'done' 
        ? `Completed task "${currentTask.title}"`
        : `Changed task "${currentTask.title}" status to ${newStatus}`,
      metadata: { 
        old_status: currentTask.status, 
        new_status: newStatus,
        title: currentTask.title 
      },
      project_id: currentTask.project_id,
      task_id: taskId,
    })

    // Also log to task_activities for backward compatibility
    await supabase
      .from('task_activities')
      .insert({
        task_id: taskId,
        user_id: userId,
        action: 'status_changed',
        old_value: { status: currentTask.status },
        new_value: { status: newStatus }
      })

    return true
  } catch (error) {
    return false
  }
}

export async function updateTaskPosition(taskId: string, newPosition: number, newStatus: Task['status'], userId: string): Promise<boolean> {
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

    return true
  } catch (error) {
    return false
  }
}

export async function createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<Task | null> {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return null
  }

  try {
    await setAppContext()
    
    // Map 'normal' priority to 'medium' for database compatibility
    // The database enum likely still uses 'medium', but we display it as 'Normal'
    const dbPriority = taskData.priority === 'normal' ? 'medium' : taskData.priority
    
    const insertData: any = {
      ...taskData,
      priority: dbPriority,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error)
      console.error('Task data:', insertData)
      console.error('Priority mapping:', { original: taskData.priority, db: dbPriority })
      return null
    }

    // Fetch project to get company_id
    let companyId: string | undefined = undefined
    if (taskData.project_id) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('company_id')
        .eq('id', taskData.project_id)
        .single()
      companyId = projectData?.company_id || undefined
    }

    // Log activity to activity_logs
    await logActivity({
      user_id: userId,
      action_type: 'task_created',
      entity_type: 'task',
      entity_id: data.id,
      description: `Created task "${taskData.title}"`,
      metadata: { title: taskData.title, status: taskData.status },
      project_id: taskData.project_id,
      company_id: companyId,
      task_id: data.id,
    })

    // Also log to task_activities for backward compatibility
    await supabase
      .from('task_activities')
      .insert({
        task_id: data.id,
        user_id: userId,
        action: 'created',
        new_value: { title: taskData.title, status: taskData.status }
      })

    return data
  } catch (error) {
    return null
  }
}

export async function createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<{ success: boolean; data?: Project; error?: string }> {
  if (!supabase) {
    return { 
      success: false, 
      error: 'Database not configured. Please check your Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY).' 
    }
  }

  try {
    // Explicitly define the fields to insert to avoid any unexpected fields
    const insertData = {
      name: projectData.name,
      description: projectData.description,
      manager_id: projectData.manager_id,
      company_id: projectData.company_id,
      status: projectData.status,
      created_by: projectData.created_by || userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Validate required fields
    if (!insertData.name || insertData.name.trim() === '') {
      return { success: false, error: 'Project name is required' }
    }
    if (!insertData.company_id) {
      return { success: false, error: 'Company ID is required' }
    }
    if (!insertData.created_by) {
      return { success: false, error: 'Created by user ID is required' }
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message || 'Failed to create project' }
    }

    if (!data) {
      return { success: false, error: 'No data returned from database' }
    }
    
    // Log activity to activity_logs
    await logActivity({
      user_id: insertData.created_by,
      action_type: 'project_created',
      entity_type: 'project',
      entity_id: data.id,
      description: `Created project "${data.name}"`,
      metadata: { name: data.name, status: data.status },
      company_id: data.company_id,
      project_id: data.id,
    })
    
    // Send notifications to all users, internal users, and managers in the space
    try {
      // Get creator's name for the notification message
      const { data: creator } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', insertData.created_by)
        .single()

      const creatorName = creator?.full_name || 'Someone'
      
      // Create space-wide notification
      await createSpaceWideNotification(
        data.company_id,
        {
          title: 'New Project Created',
          message: `${creatorName} created a new project "${data.name}"${data.description ? `: ${data.description}` : ''}`,
          created_by_user_id: insertData.created_by,
          related_project_id: data.id,
          metadata: {
            project_name: data.name,
            project_description: data.description,
            project_status: data.status
          }
        }
      )
    } catch (notificationError) {
      // Don't fail project creation if notification fails
      console.error('Error sending project creation notifications:', notificationError)
    }
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function updateProject(projectId: string, projectData: Partial<Project>): Promise<{ success: boolean; data?: Project; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    // Get current project data for activity log
    const { data: currentProject } = await supabase
      .from('projects')
      .select('name, company_id')
      .eq('id', projectId)
      .single()
    
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...projectData,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message || 'Failed to update project' }
    }

    // Log activity
    const currentUser = getCurrentUser()
    if (currentUser && data) {
      await logActivity({
        user_id: currentUser.id,
        action_type: 'project_updated',
        entity_type: 'project',
        entity_id: projectId,
        description: `Updated project "${data.name || currentProject?.name || projectId}"`,
        metadata: { 
          project_name: data.name || currentProject?.name,
          updated_fields: Object.keys(projectData)
        },
        company_id: data.company_id || currentProject?.company_id,
        project_id: projectId,
      })
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function archiveProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    // Get project data for activity log
    const { data: project } = await supabase
      .from('projects')
      .select('name, company_id')
      .eq('id', projectId)
      .single()
    
    const { error } = await supabase
      .from('projects')
      .update({
        status: 'archived' as Project['status'],
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (error) {
      return { success: false, error: error.message || 'Failed to archive project' }
    }

    // Log activity
    const currentUser = getCurrentUser()
    if (currentUser && project) {
      await logActivity({
        user_id: currentUser.id,
        action_type: 'project_archived',
        entity_type: 'project',
        entity_id: projectId,
        description: `Archived project "${project.name}"`,
        metadata: { project_name: project.name },
        company_id: project.company_id,
        project_id: projectId,
      })
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while archiving project' }
  }
}

export async function unarchiveProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const { error } = await supabase
      .from('projects')
      .update({
        status: 'active' as Project['status'],
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (error) {
      return { success: false, error: error.message || 'Failed to unarchive project' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while unarchiving project' }
  }
}

export async function updateProjectPosition(
  projectId: string,
  newPosition: number,
  companyId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const { error } = await supabase
      .from('projects')
      .update({
        position: newPosition,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (error) {
      return { success: false, error: error.message || 'Failed to update project position' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while updating project position' }
  }
}

export async function deleteProject(projectId: string, currentUserId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    // Get project data before deletion for activity log
    const { data: project } = await supabase
      .from('projects')
      .select('name, company_id')
      .eq('id', projectId)
      .single()
    
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

    // Log activity
    const currentUser = getCurrentUser()
    const userId = currentUserId || currentUser?.id
    if (userId && project) {
      await logActivity({
        user_id: userId,
        action_type: 'project_deleted',
        entity_type: 'project',
        entity_id: projectId,
        description: `Deleted project "${project.name}"`,
        metadata: { project_name: project.name },
        company_id: project.company_id,
        project_id: projectId,
      })
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while deleting project' }
  }
}

export async function addProjectManager(projectId: string, userId: string, role: string = 'manager', currentUserId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Check if current user is admin (application-level security)
    if (currentUserId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUserId)
        .single()
      
      if (userError || !userData || userData.role !== 'admin') {
        return { success: false, error: 'Access denied: Only admin users can manage project users' }
      }
    }
    
    const { error } = await supabase
      .from('project_managers')
      .insert({
        project_id: projectId,
        user_id: userId,
        role
      })

    if (error) {
      return { success: false, error: error.message || 'Failed to add project manager' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function removeProjectManager(projectId: string, userId: string, currentUserId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Check if current user is admin (application-level security)
    if (currentUserId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUserId)
        .single()
      
      if (userError || !userData || userData.role !== 'admin') {
        return { success: false, error: 'Access denied: Only admin users can manage project users' }
      }
    }
    
    const { error } = await supabase
      .from('project_managers')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message || 'Failed to remove project manager' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function addProjectMember(projectId: string, userId: string, role: string = 'member', currentUserId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Check if current user is admin (application-level security)
    if (currentUserId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUserId)
        .single()
      
      if (userError || !userData || userData.role !== 'admin') {
        return { success: false, error: 'Access denied: Only admin users can manage project users' }
      }
    }
    
    const { error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: userId,
        role
      })

    if (error) {
      return { success: false, error: error.message || 'Failed to add project member' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function removeProjectMember(projectId: string, userId: string, currentUserId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Check if current user is admin (application-level security)
    if (currentUserId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUserId)
        .single()
      
      if (userError || !userData || userData.role !== 'admin') {
        return { success: false, error: 'Access denied: Only admin users can manage project users' }
        }
    }
    
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message || 'Failed to remove project member' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function updateTask(taskId: string, taskData: Partial<Task>, userId?: string): Promise<{ success: boolean; data?: Task; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    
    // Get current task data to compare changes
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (!currentTask) {
      return { success: false, error: 'Task not found' }
    }
    
    // Map 'normal' priority to 'medium' for database compatibility
    const updateData: any = {
      ...taskData,
      updated_at: new Date().toISOString()
    }
    
    // Convert 'normal' to 'medium' if priority is being updated
    if (updateData.priority === 'normal') {
      updateData.priority = 'medium'
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message || 'Failed to update task' }
    }

    // Create notifications for significant changes
    if (userId && data) {
      const { createTaskUpdateNotification } = await import('./notification-functions')
      
      // Get current user name
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single()

      const updatedByName = userData?.full_name || 'Someone'

      // Notify on status change
      if (taskData.status && taskData.status !== currentTask.status) {
        await createTaskUpdateNotification(
          taskId,
          data.title,
          userId,
          updatedByName,
          'status',
          currentTask.status,
          taskData.status
        ).catch(() => {})
      }

      // Notify on priority change
      // Compare using the database values (both should be 'medium' for normal)
      const currentPriority = currentTask.priority === 'medium' ? 'normal' : currentTask.priority
      const newPriority = updateData.priority === 'medium' ? 'normal' : updateData.priority
      if (taskData.priority && currentPriority !== newPriority) {
        await createTaskUpdateNotification(
          taskId,
          data.title,
          userId,
          updatedByName,
          'priority',
          currentPriority,
          newPriority
        ).catch(() => {})
      }

      // Notify on due date change
      if (taskData.due_date && taskData.due_date !== currentTask.due_date) {
        await createTaskUpdateNotification(
          taskId,
          data.title,
          userId,
          updatedByName,
          'due_date',
          currentTask.due_date,
          taskData.due_date
        ).catch(() => {})
      }

      // Notify on title change
      if (taskData.title && taskData.title !== currentTask.title) {
        await createTaskUpdateNotification(
          taskId,
          data.title,
          userId,
          updatedByName,
          'title',
          currentTask.title,
          taskData.title
        ).catch(() => {})
      }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    // Get task data before deletion for activity log
    const { data: task } = await supabase
      .from('tasks')
      .select('title, project_id')
      .eq('id', taskId)
      .single()
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      return { success: false, error: error.message || 'Failed to delete task' }
    }

    // Log activity
    const currentUser = getCurrentUser()
    if (currentUser && task) {
      await logActivity({
        user_id: currentUser.id,
        action_type: 'task_deleted',
        entity_type: 'task',
        entity_id: taskId,
        description: `Deleted task "${task.title}"`,
        metadata: { task_title: task.title },
        project_id: task.project_id,
        task_id: taskId,
      })
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

interface TaskAssignment {
  assignment_id: string
  user_id: string
  full_name: string
  email: string
  assigned_at: string
  assigned_by: string | null
}

export async function getTaskAssignments(taskId: string): Promise<{ success: boolean; data?: TaskAssignment[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .rpc('get_task_assignments', { task_id_param: taskId })

    if (error) {
      return { success: false, error: error.message || 'Failed to fetch task assignments' }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function assignUsersToTask(taskId: string, userIds: string[], assignedBy?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    
    // Get current user ID from localStorage if not provided
    let currentUserId = assignedBy
    if (!currentUserId) {
      const currentUser = localStorage.getItem('auth-user')
      if (currentUser) {
        const user = JSON.parse(currentUser)
        currentUserId = user.id
      }
    }

    // Get task details and assigned user info for notifications
    const { data: task } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        project_id,
        projects:project_id(name)
      `)
      .eq('id', taskId)
      .single()

    // Get current user name for notification
    let assignedByName = 'Someone'
    if (currentUserId) {
      const { data: user } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', currentUserId)
        .single()
      if (user) assignedByName = user.full_name
    }
    
    const { error } = await supabase
      .rpc('assign_users_to_task', { 
        task_id_param: taskId, 
        user_ids: userIds,
        assigned_by_param: currentUserId || null
      })

    if (error) {
      return { success: false, error: error.message || 'Failed to assign users to task' }
    }

    // Create notifications for assigned users
    if (task) {
      const { createTaskAssignmentNotification } = await import('./notification-functions')
      const projectName = (task.projects as { name?: string })?.name
      
      for (const userId of userIds) {
        // Create notification for all assigned users, including self-assignments
        await createTaskAssignmentNotification(
          taskId,
          task.title,
          userId,
          assignedByName,
          projectName,
          currentUserId // Pass the assigner's ID
        ).catch(() => {})
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function removeUsersFromTask(taskId: string, userIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .rpc('remove_users_from_task', { 
        task_id_param: taskId, 
        user_ids: userIds
      })

    if (error) {
      return { success: false, error: error.message || 'Failed to remove users from task' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

// Notification functions








export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .rpc('mark_all_notifications_read')

    if (error) {
      return { success: false, error: error.message || 'Failed to mark all notifications as read' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function createTestNotification(userId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get the current user ID - either from parameter or from localStorage
    let currentUserId = userId
    if (!currentUserId) {
      const currentUser = localStorage.getItem('auth-user')
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' }
      }
      const user = JSON.parse(currentUser)
      currentUserId = user.id
    }

    // Try direct insert first, then fallback to RPC
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: currentUserId,
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working.',
        type: 'system'
      })

    if (insertError) {
      // Fallback to RPC function
      const { error: rpcError } = await supabase
        .rpc('create_notification', {
          target_user_id: currentUserId,
          notification_title: 'Test Notification',
          notification_message: 'This is a test notification to verify the system is working.',
          notification_type: 'system'
        })

      if (rpcError) {
        return { success: false, error: rpcError.message || 'Failed to create test notification' }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

// Test function to simulate task assignment and trigger notification
export async function testTaskAssignmentNotification(targetUserId: string, taskId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Instead of inserting into task_assignments (which has RLS issues),
    // let's create a notification directly to simulate the trigger
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        title: 'Test Task Assignment',
        message: 'This is a test notification simulating a task assignment.',
        type: 'task_assignment',
        related_id: taskId,
        related_type: 'task'
      })

    if (error) {
      return { success: false, error: error.message || 'Failed to create test notification' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

// Function to test actual task assignment (when RLS is fixed)
export async function testActualTaskAssignment(targetUserId: string, taskId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Try to insert into task_assignments to test the actual trigger
    const { error } = await supabase
      .from('task_assignments')
      .insert({
        task_id: taskId,
        user_id: targetUserId,
        assigned_by: targetUserId,
        assigned_at: new Date().toISOString()
      })

    if (error) {
      return { success: false, error: error.message || 'Failed to create actual task assignment' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

// User management functions
export async function createUser(userData: {
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'user' | 'internal'
  password: string
  assigned_manager_id?: string
  company_id?: string
  tab_permissions?: string[]
  company_ids?: string[] // For internal users
  primary_company_id?: string // For internal users
}): Promise<{ success: boolean; data?: User; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    // Hash the password using a simple approach (in production, use bcrypt)
    const hashedPassword = await hashPassword(userData.password)
    
    // Prepare insert data, excluding tab_permissions if column doesn't exist
    const insertData: {
      email: string
      full_name: string
      role: 'admin' | 'manager' | 'user' | 'internal'
      assigned_manager_id: string | null
      company_id: string | null
      is_active: boolean
      password: string
      tab_permissions?: string[]
    } = {
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      assigned_manager_id: userData.assigned_manager_id || null,
      company_id: userData.company_id || null,
      is_active: true,
      password: hashedPassword
    }

    // Include tab_permissions if provided
    if (userData.tab_permissions !== undefined) {
      insertData.tab_permissions = userData.tab_permissions
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message || 'Failed to create user' }
    }

    // If this is an internal user, admin, or manager and company_ids are provided, create company assignments
    if ((data.role === 'internal' || data.role === 'admin' || data.role === 'manager') && userData.company_ids && userData.company_ids.length > 0) {
      // Check if the table exists first
      const { error: tableCheckError } = await supabase
        .from('internal_user_companies')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        return { success: false, error: 'Internal user companies table not found. Please run the database migration first.' }
      }
      
      const companyAssignments = userData.company_ids.map((companyId, index) => ({
        user_id: data.id,
        company_id: companyId,
        is_primary: companyId === userData.primary_company_id || (index === 0 && !userData.primary_company_id),
        assigned_by: userData.assigned_manager_id || null
      }))

      const { error: assignmentError } = await supabase
        .from('internal_user_companies')
        .insert(companyAssignments)

      if (assignmentError) {
        // Don't fail the user creation, just continue silently
      }
    }

    // Log activity to activity_logs
    await logActivity({
      user_id: data.id, // The new user's ID
      action_type: 'user_created',
      entity_type: 'user',
      entity_id: data.id,
      description: `Created user "${data.full_name || data.email}"`,
      metadata: { 
        email: data.email, 
        role: data.role,
        full_name: data.full_name 
      },
      company_id: data.company_id || undefined,
    })

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function updateUser(userId: string, userData: {
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'user' | 'internal'
  is_active: boolean
  assigned_manager_id?: string
  company_id?: string
  tab_permissions?: string[]
  company_ids?: string[] // For internal users
  primary_company_id?: string // For internal users
  profile_picture?: string
}): Promise<{ success: boolean; data?: User; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    // Prepare update data, excluding tab_permissions if column doesn't exist
    const updateData: {
      email: string
      full_name: string
      role: 'admin' | 'manager' | 'user' | 'internal'
      is_active: boolean
      assigned_manager_id: string | null
      company_id: string | null
      updated_at: string
      tab_permissions?: string[]
      profile_picture?: string | null
    } = {
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      is_active: userData.is_active,
      assigned_manager_id: userData.assigned_manager_id || null,
      company_id: userData.company_id || null,
      updated_at: new Date().toISOString()
    }

    // Include tab_permissions if provided
    if (userData.tab_permissions !== undefined) {
      updateData.tab_permissions = userData.tab_permissions
    }

    // Include profile_picture if provided
    if (userData.profile_picture !== undefined) {
      updateData.profile_picture = userData.profile_picture || null
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message || 'Failed to update user' }
    }

    // If this is an internal user, admin, or manager and company_ids are provided, update company assignments
    if ((data.role === 'internal' || data.role === 'admin' || data.role === 'manager') && userData.company_ids) {
      // Check if the table exists first
      const { error: tableCheckError } = await supabase
        .from('internal_user_companies')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        return { success: false, error: 'Internal user companies table not found. Please run the database migration first.' }
      }
      
      // First, remove existing assignments
      const { error: deleteError } = await supabase
        .from('internal_user_companies')
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
        // Error deleting existing company assignments - continue anyway
      }

      // Then, create new assignments
      if (userData.company_ids.length > 0) {
        const companyAssignments = userData.company_ids.map((companyId, index) => ({
          user_id: userId,
          company_id: companyId,
          is_primary: companyId === userData.primary_company_id || (index === 0 && !userData.primary_company_id),
          assigned_by: userData.assigned_manager_id || null
        }))
        
        const { error: assignmentError } = await supabase
          .from('internal_user_companies')
          .insert(companyAssignments)

        if (assignmentError) {
          // Don't fail the user update, just continue silently
        }
      }
    }
    
    // Log activity to activity_logs
    const currentUser = getCurrentUser()
    if (currentUser) {
      await logActivity({
        user_id: currentUser.id, // The user who made the change
        action_type: 'user_updated',
        entity_type: 'user',
        entity_id: userId,
        description: `Updated user "${data.full_name || data.email}"`,
        metadata: { 
          email: data.email, 
          role: data.role,
          full_name: data.full_name 
        },
        company_id: data.company_id || undefined,
      })
    }
    
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

// Upload profile picture for a user
export async function uploadProfilePicture(userId: string, file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validImageTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' }
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size too large. Please upload an image smaller than 5MB.' }
    }

    // Get current user to check if they have an existing profile picture
    const { data: currentUser } = await supabase
      .from('users')
      .select('profile_picture')
      .eq('id', userId)
      .single()

    // Create a unique file name with timestamp for cache busting
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const sanitizedUserId = userId.replace(/-/g, '')
    const fileName = `profile-${sanitizedUserId}-${timestamp}.${fileExtension}`
    const filePath = `profile-pictures/${fileName}`

    // Upload to Supabase Storage (using documents bucket or create avatars bucket)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading profile picture:', uploadError)
      return { success: false, error: uploadError.message || 'Failed to upload profile picture' }
    }

    // Get public URL for the file with cache-busting query parameter
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    // Add timestamp to URL for cache busting
    const profilePictureUrl = `${urlData.publicUrl}?t=${timestamp}`

    // Update user record with profile picture URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ profile_picture: profilePictureUrl })
      .eq('id', userId)

    if (updateError) {
      // Try to clean up uploaded file if update fails
      await supabase.storage
        .from('documents')
        .remove([filePath])
      
      return { success: false, error: updateError.message || 'Failed to update user profile' }
    }

    // Delete old profile picture if it exists and is different
    if (currentUser?.profile_picture && currentUser.profile_picture !== profilePictureUrl) {
      try {
        // Extract path from URL (remove query parameters)
        const oldUrlWithoutQuery = currentUser.profile_picture.split('?')[0]
        const oldPathMatch = oldUrlWithoutQuery.match(/profile-pictures\/[^?]+/)
        if (oldPathMatch) {
          await supabase.storage
            .from('documents')
            .remove([oldPathMatch[0]])
        }
      } catch (error) {
        // Don't fail if old picture deletion fails
        console.warn('Failed to delete old profile picture:', error)
      }
    }

    // Invalidate user cache to ensure all components refresh
    try {
      const { invalidateUserCache } = await import('./optimized-database-functions')
      invalidateUserCache()
    } catch (error) {
      // Cache invalidation is optional, don't fail if it doesn't work
      console.warn('Failed to invalidate user cache:', error)
    }

    return { success: true, url: profilePictureUrl }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    // Verify current user has admin permissions
    const currentUser = getCurrentUser()
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Only admins can delete users' }
    }
    
    // Get user info before deleting for activity log
    const { data: userToDelete, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, company_id')
      .eq('id', userId)
      .single()
    
    if (fetchError || !userToDelete) {
      return { success: false, error: fetchError?.message || 'User not found' }
    }
    
    // Prevent users from deleting themselves
    if (userId === currentUser.id) {
      return { success: false, error: 'You cannot delete your own account' }
    }
    
    // Delete related data that references this user (in order of dependencies)
    // 1. Delete activity logs that reference this user first
    const { error: activityLogsError } = await supabase
      .from('activity_logs')
      .delete()
      .eq('user_id', userId)

    if (activityLogsError) {
      console.warn('Error deleting activity logs for user:', activityLogsError)
      // Continue anyway - some activity logs might be protected by RLS
    }
    
    // 2. Delete internal user company assignments
    const { error: internalAssignmentsError } = await supabase
      .from('internal_user_companies')
      .delete()
      .eq('user_id', userId)

    if (internalAssignmentsError) {
      console.warn('Error deleting internal user company assignments:', internalAssignmentsError)
    }
    
    // 3. Delete user invitations (if they exist)
    try {
      const { error: invitationsError } = await supabase
        .from('user_invitations')
        .delete()
        .eq('user_id', userId)
      
      if (invitationsError) {
        console.warn('Error deleting user invitations:', invitationsError)
      }
    } catch (e) {
      // Table might not exist, ignore
    }
    
    // 4. Now delete the user
    // Note: Supabase requires .select() on delete operations
    const { data: deletedUser, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error deleting user:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      // Provide more detailed error message
      let errorMessage = error.message || 'Failed to delete user'
      if (error.details) {
        errorMessage += `: ${error.details}`
      }
      if (error.hint) {
        errorMessage += ` (${error.hint})`
      }
      
      return { 
        success: false, 
        error: errorMessage
      }
    }
    
    if (!deletedUser) {
      return { success: false, error: 'User was not deleted (no data returned)' }
    }

    // Log activity to activity_logs
    if (currentUser && userToDelete) {
      await logActivity({
        user_id: currentUser.id, // The user who performed the deletion
        action_type: 'user_deleted',
        entity_type: 'user',
        entity_id: userId,
        description: `Deleted user "${userToDelete.full_name || userToDelete.email}"`,
        metadata: { 
          deleted_user_email: userToDelete.email,
          deleted_user_name: userToDelete.full_name 
        },
        company_id: userToDelete.company_id || undefined,
      })
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function fetchUsers(): Promise<User[]> {
  if (!supabase) {
    return []
  }

  try {
    // Try to fetch with tab_permissions first
    const resultWithPermissions = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at, updated_at, is_active, assigned_manager_id, company_id, tab_permissions')
      .eq('is_active', true)
      .order('full_name', { ascending: true })
    
    if (resultWithPermissions.error) {
        // Fallback to fetch without tab_permissions if column doesn't exist
        const resultWithoutPermissions = await supabase
          .from('users')
          .select('id, email, full_name, role, created_at, updated_at, is_active, assigned_manager_id, company_id, profile_picture')
          .eq('is_active', true)
          .order('full_name', { ascending: true })
      
      if (resultWithoutPermissions.error) {
        return []
      }

      // Transform data to include tab_permissions as empty array
      const users = (resultWithoutPermissions.data || []).map(user => ({
        ...user,
        tab_permissions: []
      }))
      
      return users
    }

    // Transform data to ensure tab_permissions is always an array
    const users = (resultWithPermissions.data || []).map(user => ({
      ...user,
      tab_permissions: user.tab_permissions || []
    }))
    console.log('Sample user tab permissions:', users.slice(0, 2).map(u => ({ email: u.email, tab_permissions: u.tab_permissions })))
    return users
  } catch (error) {
    console.error('Error fetching users:', error)
    return []
  }
}

// Real-time subscription functions
export function subscribeToTasks(projectId: string, callback: (tasks: TaskWithDetails[]) => void) {
  if (!supabase) {
    console.warn('Supabase not configured for real-time')
    return null
  }

  return supabase
    .channel(`tasks-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`
      },
      async () => {
        // Refetch tasks when changes occur
        const tasks = await fetchTasks(projectId)
        callback(tasks)
      }
    )
    .subscribe()
}

export function subscribeToProjects(callback: (projects: ProjectWithDetails[]) => void) {
  if (!supabase) {
    console.warn('Supabase not configured for real-time')
    return null
  }

  return supabase
    .channel('projects')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'projects'
      },
      async () => {
        // Refetch projects when changes occur
        const projects = await fetchProjects()
        callback(projects)
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks'
      },
      async () => {
        // Also refetch projects when tasks change (to update task counts)
        const projects = await fetchProjects()
        callback(projects)
      }
    )
    .subscribe()
} 

export async function testDatabaseConnection(): Promise<void> {
  if (!supabase) {
    console.warn('Supabase not configured - running in demo mode')
    return
  }

  try {
    console.log('Testing database connection...')
    
    // Test if tables exist
    const { data: projectsTest, error: projectsError } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
    
    console.log('Projects table test:', { data: projectsTest, error: projectsError })
    
    const { data: tasksTest, error: tasksError } = await supabase
      .from('tasks')
      .select('count')
      .limit(1)
    
    console.log('Tasks table test:', { data: tasksTest, error: tasksError })
    
    const { data: usersTest, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    console.log('Users table test:', { data: usersTest, error: usersError })
    
    // Test multiple users tables
    const { data: managersTest, error: managersError } = await supabase
      .from('project_managers')
      .select('count')
      .limit(1)
    
    console.log('Project managers table test:', { data: managersTest, error: managersError })
    
    const { data: membersTest, error: membersError } = await supabase
      .from('project_members')
      .select('count')
      .limit(1)
    
    console.log('Project members table test:', { data: membersTest, error: membersError })
    
  } catch (error) {
    console.error('Database connection test error:', error)
  }
}

export async function checkMultipleUsersTables(): Promise<{ projectManagers: boolean; projectMembers: boolean }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { projectManagers: false, projectMembers: false }
  }

  try {
    // Test project_managers table
    const { error: managersError } = await supabase
      .from('project_managers')
      .select('id')
      .limit(1)

    // Test project_members table
    const { error: membersError } = await supabase
      .from('project_members')
      .select('id')
      .limit(1)

    const projectManagers = !managersError
    const projectMembers = !membersError

    console.log('Multiple users tables check:', { projectManagers, projectMembers })
    return { projectManagers, projectMembers }
  } catch (error) {
    console.error('Error checking multiple users tables:', error)
    return { projectManagers: false, projectMembers: false }
  }
} 

// Company management functions
/**
 * Fetch all spaces (client workspaces)
 * Note: Database table is "companies" but we use "space" terminology throughout the codebase
 */
export async function fetchSpaces(): Promise<Space[]> {
  if (!supabase) {
    return []
  }

  try {
    // Set application context for RLS
    await setAppContext()
    
    // First try to fetch with is_active filter
    let { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    // If that fails, try without the is_active filter
    if (error && error.message.includes('column "is_active" does not exist')) {
      const result = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true })
      
      data = result.data
      error = result.error
    }

    if (error) {
      return []
    }

    // Decrypt API keys and credentials after fetching
    const decryptedData = await Promise.all((data || []).map(async (space) => ({
      ...space,
      // Legacy API keys
      meta_api_key: space.meta_api_key ? await decrypt(space.meta_api_key) : undefined,
      google_api_key: space.google_api_key ? await decrypt(space.google_api_key) : undefined,
      shopify_api_key: space.shopify_api_key ? await decrypt(space.shopify_api_key) : undefined,
      klaviyo_api_key: space.klaviyo_api_key ? await decrypt(space.klaviyo_api_key) : undefined,
      // Google Ads API credentials (decrypt sensitive fields)
      google_ads_developer_token: space.google_ads_developer_token ? await decrypt(space.google_ads_developer_token) : undefined,
      google_ads_client_secret: space.google_ads_client_secret ? await decrypt(space.google_ads_client_secret) : undefined,
      google_ads_refresh_token: space.google_ads_refresh_token ? await decrypt(space.google_ads_refresh_token) : undefined,
      // Meta Ads API credentials (decrypt sensitive fields)
      meta_ads_app_secret: space.meta_ads_app_secret ? await decrypt(space.meta_ads_app_secret) : undefined,
      meta_ads_access_token: space.meta_ads_access_token ? await decrypt(space.meta_ads_access_token) : undefined,
      meta_ads_system_user_token: space.meta_ads_system_user_token ? await decrypt(space.meta_ads_system_user_token) : undefined,
      // Shopify API credentials (decrypt sensitive fields)
      shopify_api_secret_key: space.shopify_api_secret_key ? await decrypt(space.shopify_api_secret_key) : undefined,
      shopify_access_token: space.shopify_access_token ? await decrypt(space.shopify_access_token) : undefined,
      // Klaviyo API credentials (decrypt sensitive fields)
      klaviyo_private_api_key: space.klaviyo_private_api_key ? await decrypt(space.klaviyo_private_api_key) : undefined,
    })))

    return decryptedData
  } catch (error) {
    return []
  }
}

/** @deprecated Use fetchSpaces instead. This function exists for backward compatibility. */
export async function fetchCompanies(): Promise<Company[]> {
  return fetchSpaces() as Promise<Company[]>
}

export async function fetchCompaniesWithServices(): Promise<Company[]> {
  if (!supabase) {
    return []
  }

  try {
    // Set application context for RLS
    await setAppContext()
    
    // First try to fetch with is_active filter
    let { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        company_services!company_services_company_id_fkey(
          service_id,
          service:services!company_services_service_id_fkey(
            id,
            name,
            description
          )
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true })

    // If that fails, try without the is_active filter
    if (error && error.message.includes('column "is_active" does not exist')) {
      const result = await supabase
        .from('companies')
        .select(`
          *,
          company_services!company_services_company_id_fkey(
            service_id,
            service:services!company_services_service_id_fkey(
              id,
              name,
              description
            )
          )
        `)
        .order('name', { ascending: true })
      
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Error fetching companies with services:', error)
      return []
    }

    // Transform the data to flatten the services structure and decrypt API keys
    const transformedData = await Promise.all((data || []).map(async (company) => {
      const services = company.company_services
        ?.map((cs: { service_id: string; service: Service }) => cs.service)
        .filter(Boolean) || []
      
      console.log(`Company ${company.name} has ${services.length} services:`, services.map((s: Service) => s.name))
      
      return {
        ...company,
        services,
        // Legacy API keys
        meta_api_key: company.meta_api_key ? await decrypt(company.meta_api_key) : undefined,
        google_api_key: company.google_api_key ? await decrypt(company.google_api_key) : undefined,
        shopify_api_key: company.shopify_api_key ? await decrypt(company.shopify_api_key) : undefined,
        klaviyo_api_key: company.klaviyo_api_key ? await decrypt(company.klaviyo_api_key) : undefined,
        // Google Ads API credentials (decrypt sensitive fields)
        google_ads_developer_token: company.google_ads_developer_token ? await decrypt(company.google_ads_developer_token) : undefined,
        google_ads_client_secret: company.google_ads_client_secret ? await decrypt(company.google_ads_client_secret) : undefined,
        google_ads_refresh_token: company.google_ads_refresh_token ? await decrypt(company.google_ads_refresh_token) : undefined,
        // Meta Ads API credentials (decrypt sensitive fields)
        meta_ads_app_secret: company.meta_ads_app_secret ? await decrypt(company.meta_ads_app_secret) : undefined,
        meta_ads_access_token: company.meta_ads_access_token ? await decrypt(company.meta_ads_access_token) : undefined,
        meta_ads_system_user_token: company.meta_ads_system_user_token ? await decrypt(company.meta_ads_system_user_token) : undefined,
        // Shopify API credentials (decrypt sensitive fields)
        shopify_api_secret_key: company.shopify_api_secret_key ? await decrypt(company.shopify_api_secret_key) : undefined,
        shopify_access_token: company.shopify_access_token ? await decrypt(company.shopify_access_token) : undefined,
        // Klaviyo API credentials (decrypt sensitive fields)
        klaviyo_private_api_key: company.klaviyo_private_api_key ? await decrypt(company.klaviyo_private_api_key) : undefined,
      }
    }))

    return transformedData
  } catch (error) {
    console.error('Error in fetchCompaniesWithServices:', error)
    return []
  }
}

/**
 * Create a new space (client workspace)
 * Note: Database table is "companies" but we use "space" terminology throughout the codebase
 */
export async function createSpace(spaceData: {
  name: string
  description?: string
  industry?: string
  website?: string
  phone?: string
  address?: string
  is_partner?: boolean
  retainer?: number
  revenue?: number
  manager_id?: string | null
}): Promise<{ success: boolean; data?: Space; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Creating space:', spaceData)
    await setAppContext()
    
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: spaceData.name,
        description: spaceData.description,
        industry: spaceData.industry,
        website: spaceData.website,
        phone: spaceData.phone,
        address: spaceData.address,
        is_partner: spaceData.is_partner || false,
        is_active: true,
        retainer: spaceData.retainer,
        revenue: spaceData.revenue,
        manager_id: spaceData.manager_id || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating space:', error)
      return { success: false, error: error.message || 'Failed to create space' }
    }

    console.log('Space created successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error creating space:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

/** @deprecated Use createSpace instead. This function exists for backward compatibility. */
export async function createCompany(companyData: {
  name: string
  description?: string
  industry?: string
  website?: string
  phone?: string
  address?: string
  is_partner?: boolean
  retainer?: number
  revenue?: number
  manager_id?: string | null
}): Promise<{ success: boolean; data?: Company; error?: string }> {
  const result = await createSpace(companyData)
  return { ...result, data: result.data as Company | undefined }
}

/**
 * Creates the default onboarding document as a PDF in the external documents folder
 * This function calls a server-side API route to generate the PDF
 */
export async function createDefaultOnboardingDocument(
  companyId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/create-onboarding-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyId, userId }),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error creating default onboarding document:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

/**
 * Creates a default onboarding project with standard tasks for a new space
 */
export async function createDefaultOnboardingProject(
  companyId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()

    // Create the default project
    const projectResult = await createProject(
      {
        name: 'Onboarding',
        description: 'Default onboarding project',
        company_id: companyId,
        status: 'active',
        manager_id: null,
        created_by: userId
      },
      userId
    )

    if (!projectResult.success || !projectResult.data) {
      return { success: false, error: projectResult.error || 'Failed to create default project' }
    }

    const projectId = projectResult.data.id

    // Default onboarding tasks
    const defaultTasks = [
      'Onboarding Form',
      'Shopify Access',
      'Meta Access',
      'Google Access',
      'Google Ads',
      'Google Analytics',
      'Merchant Center',
      'Youtube Studio'
    ]

    // Create all tasks
    for (let i = 0; i < defaultTasks.length; i++) {
      const taskTitle = defaultTasks[i]
      const taskResult = await createTask(
        {
          project_id: projectId,
          title: taskTitle,
          description: undefined,
          status: 'todo',
          priority: 'high', // High priority as requested
          assigned_to: undefined, // Unassigned as requested
          due_date: undefined, // No due date as requested
          estimated_hours: 0,
          actual_hours: 0,
          position: i + 1,
          created_by: userId
        },
        userId
      )

      if (!taskResult) {
        // Log error but continue creating other tasks
        console.error(`Failed to create task: ${taskTitle}`)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error creating default onboarding project:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function updateCompany(companyId: string, companyData: {
  name?: string
  description?: string
  industry?: string
  website?: string
  phone?: string
  address?: string
  is_active?: boolean
  is_partner?: boolean
  retainer?: number
  revenue?: number
  manager_id?: string | null
  // Legacy API keys
  meta_api_key?: string
  google_api_key?: string
  shopify_api_key?: string
  klaviyo_api_key?: string
  // Google Ads API credentials
  google_ads_developer_token?: string
  google_ads_client_id?: string
  google_ads_client_secret?: string
  google_ads_refresh_token?: string
  google_ads_customer_id?: string
  // Meta Ads API credentials
  meta_ads_app_id?: string
  meta_ads_app_secret?: string
  meta_ads_access_token?: string
  meta_ads_ad_account_id?: string
  meta_ads_system_user_token?: string
  // Shopify API credentials
  shopify_store_domain?: string
  shopify_api_secret_key?: string
  shopify_access_token?: string
  shopify_scopes?: string
  // Klaviyo API credentials
  klaviyo_public_api_key?: string
  klaviyo_private_api_key?: string
}): Promise<{ success: boolean; data?: Company; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Updating company:', companyId, companyData)
    await setAppContext()
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Only include fields that are provided
    if (companyData.name !== undefined) updateData.name = companyData.name
    if (companyData.description !== undefined) updateData.description = companyData.description
    if (companyData.industry !== undefined) updateData.industry = companyData.industry
    if (companyData.website !== undefined) updateData.website = companyData.website
    if (companyData.phone !== undefined) updateData.phone = companyData.phone
    if (companyData.address !== undefined) updateData.address = companyData.address
    if (companyData.is_partner !== undefined) updateData.is_partner = companyData.is_partner
    if (companyData.is_active !== undefined) updateData.is_active = companyData.is_active
    if (companyData.retainer !== undefined) updateData.retainer = companyData.retainer
    if (companyData.revenue !== undefined) updateData.revenue = companyData.revenue

    // Add legacy API keys if provided (encrypt before storing)
    if (companyData.meta_api_key !== undefined) {
      updateData.meta_api_key = companyData.meta_api_key ? await encrypt(companyData.meta_api_key) : null
    }
    if (companyData.google_api_key !== undefined) {
      updateData.google_api_key = companyData.google_api_key ? await encrypt(companyData.google_api_key) : null
    }
    if (companyData.shopify_api_key !== undefined) {
      updateData.shopify_api_key = companyData.shopify_api_key ? await encrypt(companyData.shopify_api_key) : null
    }
    if (companyData.klaviyo_api_key !== undefined) {
      updateData.klaviyo_api_key = companyData.klaviyo_api_key ? await encrypt(companyData.klaviyo_api_key) : null
    }

    // Add Google Ads API credentials (encrypt sensitive fields)
    if (companyData.google_ads_developer_token !== undefined) {
      updateData.google_ads_developer_token = companyData.google_ads_developer_token ? await encrypt(companyData.google_ads_developer_token) : null
    }
    if (companyData.google_ads_client_id !== undefined) {
      updateData.google_ads_client_id = companyData.google_ads_client_id || null
    }
    if (companyData.google_ads_client_secret !== undefined) {
      updateData.google_ads_client_secret = companyData.google_ads_client_secret ? await encrypt(companyData.google_ads_client_secret) : null
    }
    if (companyData.google_ads_refresh_token !== undefined) {
      updateData.google_ads_refresh_token = companyData.google_ads_refresh_token ? await encrypt(companyData.google_ads_refresh_token) : null
    }
    if (companyData.google_ads_customer_id !== undefined) {
      updateData.google_ads_customer_id = companyData.google_ads_customer_id || null
    }

    // Add Meta Ads API credentials (encrypt sensitive fields)
    if (companyData.meta_ads_app_id !== undefined) {
      updateData.meta_ads_app_id = companyData.meta_ads_app_id || null
    }
    if (companyData.meta_ads_app_secret !== undefined) {
      updateData.meta_ads_app_secret = companyData.meta_ads_app_secret ? await encrypt(companyData.meta_ads_app_secret) : null
    }
    if (companyData.meta_ads_access_token !== undefined) {
      updateData.meta_ads_access_token = companyData.meta_ads_access_token ? await encrypt(companyData.meta_ads_access_token) : null
    }
    if (companyData.meta_ads_ad_account_id !== undefined) {
      updateData.meta_ads_ad_account_id = companyData.meta_ads_ad_account_id || null
    }
    if (companyData.meta_ads_system_user_token !== undefined) {
      updateData.meta_ads_system_user_token = companyData.meta_ads_system_user_token ? await encrypt(companyData.meta_ads_system_user_token) : null
    }

    // Add Shopify API credentials (encrypt sensitive fields)
    if (companyData.shopify_store_domain !== undefined) {
      updateData.shopify_store_domain = companyData.shopify_store_domain || null
    }
    if (companyData.shopify_api_key !== undefined) {
      updateData.shopify_api_key = companyData.shopify_api_key ? await encrypt(companyData.shopify_api_key) : null
    }
    if (companyData.shopify_api_secret_key !== undefined) {
      updateData.shopify_api_secret_key = companyData.shopify_api_secret_key ? await encrypt(companyData.shopify_api_secret_key) : null
    }
    if (companyData.shopify_access_token !== undefined) {
      updateData.shopify_access_token = companyData.shopify_access_token ? await encrypt(companyData.shopify_access_token) : null
    }
    if (companyData.shopify_scopes !== undefined) {
      updateData.shopify_scopes = companyData.shopify_scopes || null
    }

    // Add Klaviyo API credentials (encrypt sensitive fields)
    if (companyData.klaviyo_public_api_key !== undefined) {
      updateData.klaviyo_public_api_key = companyData.klaviyo_public_api_key || null
    }
    if (companyData.klaviyo_private_api_key !== undefined) {
      updateData.klaviyo_private_api_key = companyData.klaviyo_private_api_key ? await encrypt(companyData.klaviyo_private_api_key) : null
    }

    // Only include manager_id if it's provided (can be null to remove manager)
    if (companyData.manager_id !== undefined) {
      updateData.manager_id = companyData.manager_id
    }

    const { data, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId)
      .select()
      .single()

    if (error) {
      // Gracefully handle missing API key columns
      if (error.message?.includes('meta_api_key') || 
          error.message?.includes('google_api_key') || 
          error.message?.includes('shopify_api_key') || 
          error.message?.includes('klaviyo_api_key') ||
          (error as any).code === 'PGRST204') {
        console.warn('API key columns not found in companies table, retrying without API keys')
        
        // Retry without API keys
        const updateDataWithoutApiKeys = { ...updateData }
        delete updateDataWithoutApiKeys.meta_api_key
        delete updateDataWithoutApiKeys.google_api_key
        delete updateDataWithoutApiKeys.shopify_api_key
        delete updateDataWithoutApiKeys.klaviyo_api_key
        
        const { data: retryData, error: retryError } = await supabase
          .from('companies')
          .update(updateDataWithoutApiKeys)
          .eq('id', companyId)
          .select()
          .single()
        
        if (retryError) {
          console.error('Error updating company:', retryError)
          return { success: false, error: retryError.message || 'Failed to update company' }
        }
        
        console.log('Company updated successfully (without API keys):', retryData)
        return { success: true, data: retryData }
      }
      
      console.error('Error updating company:', error)
      return { success: false, error: error.message || 'Failed to update company' }
    }

    // Log activity
    const currentUser = getCurrentUser()
    if (currentUser && data) {
      await logActivity({
        user_id: currentUser.id,
        action_type: 'company_updated',
        entity_type: 'company',
        entity_id: companyId,
        description: `Updated company "${data.name}"`,
        metadata: { 
          company_name: data.name,
          updated_fields: Object.keys(updateData).filter(k => k !== 'updated_at')
        },
        company_id: companyId,
      })
    }

    console.log('Company updated successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error updating company:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function deleteCompany(companyId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Deleting company:', companyId)
    await setAppContext()
    
    // First, check if company exists
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    if (fetchError) {
      console.error('Error fetching company:', fetchError)
      return { success: false, error: fetchError.message || 'Company not found' }
    }

    if (!company) {
      return { success: false, error: 'Company not found' }
    }

    // Delete related data in the correct order (cascading deletion)
    // 1. Delete activity logs for tasks in projects belonging to this company
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('company_id', companyId)

    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id)
      
      // Get all tasks for these projects
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .in('project_id', projectIds)

      if (tasks && tasks.length > 0) {
        const taskIds = tasks.map(t => t.id)
        
        // Delete activity logs for these tasks
        const { error: activityLogsError } = await supabase
          .from('activity_logs')
          .delete()
          .in('task_id', taskIds)

        if (activityLogsError) {
          console.warn('Error deleting activity logs (continuing anyway):', activityLogsError)
        }

        // 2. Delete tasks
        const { error: tasksError } = await supabase
          .from('tasks')
          .delete()
          .in('project_id', projectIds)

        if (tasksError) {
          console.warn('Error deleting tasks (continuing anyway):', tasksError)
        }
      }

      // 3. Delete projects
      const { error: projectsError } = await supabase
        .from('projects')
        .delete()
        .eq('company_id', companyId)

      if (projectsError) {
        console.warn('Error deleting projects (continuing anyway):', projectsError)
      }
    }

    // 4. Delete documents (both regular and rich documents)
    const { error: documentsError } = await supabase
      .from('documents')
      .delete()
      .eq('company_id', companyId)

    if (documentsError) {
      console.warn('Error deleting documents (continuing anyway):', documentsError)
    }

    const { error: richDocumentsError } = await supabase
      .from('rich_documents')
      .delete()
      .eq('company_id', companyId)

    if (richDocumentsError) {
      console.warn('Error deleting rich documents (continuing anyway):', richDocumentsError)
    }

    // 5. Delete company services associations
    const { error: companyServicesError } = await supabase
      .from('company_services')
      .delete()
      .eq('company_id', companyId)

    if (companyServicesError) {
      console.warn('Error deleting company services (continuing anyway):', companyServicesError)
    }

    // 6. Delete internal user company assignments
    const { error: internalUserCompaniesError } = await supabase
      .from('internal_user_companies')
      .delete()
      .eq('company_id', companyId)

    if (internalUserCompaniesError) {
      console.warn('Error deleting internal user company assignments (continuing anyway):', internalUserCompaniesError)
    }

    // 7. Update users to remove company_id reference (set to null)
    const { error: usersUpdateError } = await supabase
      .from('users')
      .update({ company_id: null })
      .eq('company_id', companyId)

    if (usersUpdateError) {
      console.warn('Error updating users (continuing anyway):', usersUpdateError)
    }

    // Now attempt to delete the company
    const { error, data } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId)
      .select()

    if (error) {
      // Handle specific error types
      let errorMessage = 'Failed to delete company'
      
      // Check for error message first
      if (error.message) {
        errorMessage = error.message
        
        // Parse foreign key constraint errors for better user messages
        if (error.message.includes('violates foreign key constraint')) {
          if (error.message.includes('activity_logs')) {
            errorMessage = 'Cannot delete company: There are activity logs associated with tasks in this company. Please delete all tasks and their associated data first.'
          } else if (error.message.includes('tasks')) {
            errorMessage = 'Cannot delete company: There are tasks associated with this company. Please delete all tasks first.'
          } else if (error.message.includes('projects')) {
            errorMessage = 'Cannot delete company: There are projects associated with this company. Please delete all projects first.'
          } else if (error.message.includes('users')) {
            errorMessage = 'Cannot delete company: There are users associated with this company. Please remove all users first.'
          } else if (error.message.includes('documents')) {
            errorMessage = 'Cannot delete company: There are documents associated with this company. Please delete all documents first.'
          } else {
            errorMessage = 'Cannot delete company: It is referenced by other records. Please remove all associated data first.'
          }
        }
      } else if (error.code) {
        // Handle PostgreSQL error codes
        if (error.code === '23503') {
          errorMessage = 'Cannot delete company: It is referenced by other records (users, projects, documents, tasks, etc.). Please remove all associated data first.'
        } else if (error.code === '42501') {
          errorMessage = 'Permission denied: You do not have permission to delete this company.'
        } else {
          errorMessage = `Database error (${error.code}): ${error.details || 'Unknown error'}`
        }
      } else if (error.details) {
        errorMessage = error.details
        
        // Parse foreign key constraint errors in details too
        if (error.details.includes('violates foreign key constraint')) {
          if (error.details.includes('activity_logs')) {
            errorMessage = 'Cannot delete company: There are activity logs associated with tasks in this company. Please delete all tasks and their associated data first.'
          } else {
            errorMessage = 'Cannot delete company: It is referenced by other records. Please remove all associated data first.'
          }
        }
      } else if (error.hint) {
        errorMessage = `${errorMessage}. ${error.hint}`
      } else {
        // If error object is empty or doesn't have standard properties
        const errorString = JSON.stringify(error)
        if (errorString !== '{}') {
          errorMessage = `Error: ${errorString}`
        } else {
          // Default message for empty error objects (likely foreign key constraint)
          errorMessage = 'Cannot delete company: It is referenced by other records (users, projects, documents, tasks, activity logs, etc.). Please remove all associated data first.'
        }
      }
      
      // Log the formatted error message (only log raw error if it has useful info)
      if (error.message || error.code || error.details) {
        console.error('Error deleting company:', errorMessage)
      } else {
        console.error('Error deleting company:', errorMessage, '(Raw error object was empty or unhelpful)')
      }
      
      return { success: false, error: errorMessage }
    }

    // Log activity
    const currentUser = getCurrentUser()
    if (currentUser && company) {
      await logActivity({
        user_id: currentUser.id,
        action_type: 'company_deleted',
        entity_type: 'company',
        entity_id: companyId,
        description: `Deleted company "${company.name}"`,
        metadata: { company_name: company.name },
        company_id: companyId,
      })
    }

    console.log('Company deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('Error deleting company:', error)
    
    // Better error handling for caught errors
    let errorMessage = 'An unexpected error occurred'
    
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as any
      if (errorObj.message) {
        errorMessage = errorObj.message
      } else if (errorObj.details) {
        errorMessage = errorObj.details
      } else {
        const errorString = JSON.stringify(error)
        if (errorString !== '{}') {
          errorMessage = `Error: ${errorString}`
        }
      }
    }
    
    return { success: false, error: errorMessage }
  }
} 

// Form Management Functions
export async function fetchForms(): Promise<Form[]> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return []
  }

  try {
    console.log('Fetching forms from database...')
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    console.log('Forms query result:', { data, error })

    if (error) {
      console.error('Error fetching forms:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching forms:', error)
    return []
  }
}

export async function fetchFormsForSpace(spaceId: string): Promise<Form[]> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return []
  }

  try {
    console.log('Fetching forms for space:', spaceId)
    const { data, error } = await supabase
      .from('form_spaces')
      .select(`
        form_id,
        forms:form_id (*)
      `)
      .eq('company_id', spaceId)

    if (error) {
      console.error('Error fetching forms for space:', error)
      return []
    }

    // Extract forms from the joined data
    const forms = (data || []).map((item: any) => item.forms).filter(Boolean)
    return forms || []
  } catch (error) {
    console.error('Error fetching forms for space:', error)
    return []
  }
}

export async function assignFormToSpace(formId: string, spaceId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('form_spaces')
      .insert({
        form_id: formId,
        company_id: spaceId
      })

    if (error) {
      console.error('Error assigning form to space:', error)
      return { success: false, error: error.message || 'Failed to assign form to space' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error assigning form to space:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function unassignFormFromSpace(formId: string, spaceId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('form_spaces')
      .delete()
      .eq('form_id', formId)
      .eq('company_id', spaceId)

    if (error) {
      console.error('Error unassigning form from space:', error)
      return { success: false, error: error.message || 'Failed to unassign form from space' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error unassigning form from space:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function createForm(formData: {
  title: string
  description?: string
  fields: FormField[]
  is_active?: boolean
}, userId: string): Promise<{ success: boolean; data?: Form; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Creating form:', formData)
    
    const { data, error } = await supabase
      .from('forms')
      .insert({
        title: formData.title,
        description: formData.description,
        fields: formData.fields,
        is_active: formData.is_active ?? true,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating form:', error)
      return { success: false, error: error.message || 'Failed to create form' }
    }

    console.log('Form created successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error creating form:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function updateForm(formId: string, formData: {
  title?: string
  description?: string
  fields?: FormField[]
  is_active?: boolean
}, userId: string): Promise<{ success: boolean; data?: Form; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Updating form:', formId, formData)
    
    const { data, error } = await supabase
      .from('forms')
      .update(formData)
      .eq('id', formId)
      .select()
      .single()

    if (error) {
      console.error('Error updating form:', error)
      return { success: false, error: error.message || 'Failed to update form' }
    }

    // Log activity
    await logActivity({
      user_id: userId,
      action_type: 'form_updated',
      entity_type: 'form',
      entity_id: formId,
      description: `Updated form "${data.title}"`,
      metadata: { 
        form_title: data.title,
        updated_fields: Object.keys(formData)
      },
    })

    console.log('Form updated successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error updating form:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function deleteForm(formId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Deleting form:', formId)
    
    const { error } = await supabase
      .from('forms')
      .delete()
      .eq('id', formId)

    if (error) {
      console.error('Error deleting form:', error)
      return { success: false, error: error.message || 'Failed to delete form' }
    }

    console.log('Form deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('Error deleting form:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function submitForm(formId: string, submissionData: Record<string, unknown>, userId: string, spaceId?: string | null): Promise<{ success: boolean; data?: FormSubmission; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Submitting form:', formId, submissionData, 'from space:', spaceId)
    
    // Fetch form to check if saveAsDocument is enabled
    let shouldSaveAsDocument = false
    if (spaceId) {
      try {
        const { data: formData } = await supabase
          .from('forms')
          .select('description')
          .eq('id', formId)
          .single()
        
        if (formData?.description) {
          const settingsMatch = formData.description.match(/__SETTINGS__({[\s\S]*?})__SETTINGS__/)
          if (settingsMatch) {
            try {
              const settings = JSON.parse(settingsMatch[1])
              shouldSaveAsDocument = settings.saveAsDocument !== false // Default to true
            } catch (e) {
              console.error('Error parsing form settings:', e)
            }
          } else {
            // No settings found, default to true
            shouldSaveAsDocument = true
          }
        } else {
          // No description, default to true
          shouldSaveAsDocument = true
        }
      } catch (e) {
        console.error('Error fetching form settings:', e)
        // Default to true if we can't fetch
        shouldSaveAsDocument = true
      }
    }
    
    // Use database function to bypass PostgREST checks that might reference forms.company_id
    const { data, error: rpcError } = await supabase.rpc('submit_form_submission', {
      p_form_id: formId,
      p_user_id: userId,
      p_submission_data: submissionData,
      p_company_id: spaceId || null
    })

    if (rpcError) {
      console.error('Error calling submit_form_submission function:', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code,
        fullError: JSON.stringify(rpcError, null, 2)
      })
      
      // Fallback to direct insert if function doesn't exist
      console.log('Falling back to direct insert...')
      const { error: insertError } = await supabase
        .from('form_submissions')
        .insert({
          form_id: formId,
          user_id: userId,
          submission_data: submissionData,
          company_id: spaceId || null
        })

      if (insertError) {
        console.error('Error inserting form submission:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          fullError: JSON.stringify(insertError, null, 2)
        })
        return { 
          success: false, 
          error: insertError.message || insertError.details || insertError.hint || 'Failed to submit form' 
        }
      }

      // Construct the submission data manually if direct insert succeeded
      const submission: FormSubmission = {
        id: '', // Will be generated by database
        form_id: formId,
        user_id: userId,
        company_id: spaceId || null,
        submission_data: submissionData,
        submitted_at: new Date().toISOString()
      }

      console.log('Form submitted successfully (direct insert fallback)')
      
      // Save as document if enabled and spaceId is provided
      if (shouldSaveAsDocument && spaceId) {
        try {
          // Fetch form title for document name
          const { data: formData } = await supabase
            .from('forms')
            .select('title')
            .eq('id', formId)
            .single()
          
          const formTitle = formData?.title || 'Form Submission'
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const documentTitle = `${formTitle} - ${timestamp}`
          
          // Format submission data as readable text
          const documentContent = Object.entries(submissionData)
            .map(([key, value]) => {
              if (value && typeof value === 'object' && 'url' in value) {
                // File upload
                return `${key}: ${(value as any).name || 'File uploaded'} (${(value as any).url || 'N/A'})`
              } else if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`
              } else {
                return `${key}: ${String(value)}`
              }
            })
            .join('\n')
          
          // Create document in the space's internal documents folder
          // spaceId is passed as companyId to ensure it's saved to the correct space
          await saveRichDocument(
            documentTitle,
            documentContent,
            spaceId, // This ensures the document is saved to the correct space
            userId,
            '/internal', // Internal documents folder path
            undefined,
            true // isInternal = true - marks it as an internal document
          )
          console.log(`Form response saved as document in space ${spaceId}'s internal folder`)
        } catch (docError) {
          console.error('Error saving form response as document:', docError)
          // Don't fail the submission if document creation fails
        }
      }
      
      return { success: true, data: submission }
    }

    // Function call succeeded - data is now the UUID of the inserted row
    if (data) {
      const submissionId = typeof data === 'string' ? data : String(data)
      // Construct submission object with the returned ID
      const submission: FormSubmission = {
        id: submissionId,
        form_id: formId,
        user_id: userId,
        company_id: spaceId || null,
        submission_data: submissionData,
        submitted_at: new Date().toISOString()
      }
      console.log('Form submitted successfully via function, ID:', submissionId)
      
      // Save as document if enabled and spaceId is provided
      if (shouldSaveAsDocument && spaceId) {
        try {
          // Fetch form title for document name
          const { data: formData } = await supabase
            .from('forms')
            .select('title')
            .eq('id', formId)
            .single()
          
          const formTitle = formData?.title || 'Form Submission'
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const documentTitle = `${formTitle} - ${timestamp}`
          
          // Format submission data as readable text
          const documentContent = Object.entries(submissionData)
            .map(([key, value]) => {
              if (value && typeof value === 'object' && 'url' in value) {
                // File upload
                return `${key}: ${(value as any).name || 'File uploaded'} (${(value as any).url || 'N/A'})`
              } else if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`
              } else {
                return `${key}: ${String(value)}`
              }
            })
            .join('\n')
          
          // Create document in the space's internal documents folder
          // spaceId is passed as companyId to ensure it's saved to the correct space
          await saveRichDocument(
            documentTitle,
            documentContent,
            spaceId, // This ensures the document is saved to the correct space
            userId,
            '/internal', // Internal documents folder path
            undefined,
            true // isInternal = true - marks it as an internal document
          )
          console.log(`Form response saved as document in space ${spaceId}'s internal folder`)
        } catch (docError) {
          console.error('Error saving form response as document:', docError)
          // Don't fail the submission if document creation fails
        }
      }
      
      return { success: true, data: submission }
    }

    // Function returned no data (shouldn't happen)
    console.warn('submit_form_submission returned no data')
    const submission: FormSubmission = {
      id: '',
      form_id: formId,
      user_id: userId,
      company_id: spaceId || null,
      submission_data: submissionData,
      submitted_at: new Date().toISOString()
    }
    
    // Save as document if enabled and spaceId is provided
    if (shouldSaveAsDocument && spaceId) {
      try {
        // Fetch form title for document name
        const { data: formData } = await supabase
          .from('forms')
          .select('title')
          .eq('id', formId)
          .single()
        
        const formTitle = formData?.title || 'Form Submission'
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const documentTitle = `${formTitle} - ${timestamp}`
        
        // Format submission data as readable text
        const documentContent = Object.entries(submissionData)
          .map(([key, value]) => {
            if (value && typeof value === 'object' && 'url' in value) {
              // File upload
              return `${key}: ${(value as any).name || 'File uploaded'} (${(value as any).url || 'N/A'})`
            } else if (Array.isArray(value)) {
              return `${key}: ${value.join(', ')}`
            } else {
              return `${key}: ${String(value)}`
            }
          })
          .join('\n')
        
        // Create document in internal documents folder
        await saveRichDocument(
          documentTitle,
          documentContent,
          spaceId,
          userId,
          '/internal', // Internal documents folder
          undefined,
          true // isInternal = true
        )
        console.log('Form response saved as document in internal folder')
      } catch (docError) {
        console.error('Error saving form response as document:', docError)
        // Don't fail the submission if document creation fails
      }
    }
    
    return { success: true, data: submission }
  } catch (error) {
    console.error('Error submitting form (catch block):', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }
  }
}

export async function fetchUserFormSubmissions(userId: string): Promise<FormSubmission[]> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return []
  }

  try {
    console.log('Fetching user form submissions:', userId)
    const { data, error } = await supabase
      .from('form_submissions')
      .select(`
        *,
        form:forms(id, title, description),
        company:companies!form_submissions_company_id_fkey(id, name)
      `)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })

    console.log('User form submissions query result:', { data, error })

    if (error) {
      console.error('Error fetching user form submissions:', error)
      return []
    }

    return (data || []) as FormSubmission[]
  } catch (error) {
    console.error('Error fetching user form submissions:', error)
    return []
  }
}

// Check if a user has submitted a specific form for a space
export async function hasUserSubmittedForm(userId: string, formId: string, companyId: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return false
  }

  try {
    const { data, error } = await supabase
      .from('form_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('form_id', formId)
      .eq('company_id', companyId)
      .limit(1)

    if (error) {
      console.error('Error checking form submission:', error)
      return false
    }

    return (data?.length || 0) > 0
  } catch (error) {
    console.error('Error checking form submission:', error)
    return false
  }
}

export async function fetchFormSubmissions(formId: string): Promise<FormSubmission[]> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return []
  }

  try {
    console.log('Fetching form submissions:', formId)
    const { data, error } = await supabase
      .from('form_submissions')
      .select(`
        *,
        user:users!form_submissions_user_id_fkey(id, full_name, email),
        company:companies!form_submissions_company_id_fkey(id, name)
      `)
      .eq('form_id', formId)
      .order('submitted_at', { ascending: false })

    console.log('Form submissions query result:', { data, error })

    if (error) {
      console.error('Error fetching form submissions:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching form submissions:', error)
    return []
  }
}

export async function checkDatabaseSetup(): Promise<{ 
  usersTableExists: boolean
  companiesTableExists: boolean
  companyIdColumnExists: boolean
  connectionWorking: boolean
  error?: string 
}> {
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
      console.error('Error checking users table:', usersError)
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
      console.error('Error checking companies table:', companiesError)
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
      console.error('Error checking company_id column:', companyIdError)
      return {
        usersTableExists: true,
        companiesTableExists: true,
        companyIdColumnExists: false,
        connectionWorking: true,
        error: companyIdError.message
      }
    }

    // Try to add tab_permissions column if it doesn't exist
    await ensureTabPermissionsColumn()

    return {
      usersTableExists: true,
      companiesTableExists: true,
      companyIdColumnExists: true,
      connectionWorking: true
    }
  } catch (error) {
    console.error('Error checking database setup:', error)
    return {
      usersTableExists: false,
      companiesTableExists: false,
      companyIdColumnExists: false,
      connectionWorking: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

// Function to ensure tab_permissions column exists
async function ensureTabPermissionsColumn(): Promise<void> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return
  }

  try {
    // Try to select tab_permissions to see if it exists
    const { error } = await supabase
      .from('users')
      .select('tab_permissions')
      .limit(1)

    if (error && error.message.includes('column "tab_permissions" does not exist')) {
      console.log('tab_permissions column does not exist yet. Please run the migration manually.')
      console.log('You can run the SQL in database/add-tab-permissions.sql in your Supabase dashboard.')
    } else if (error) {
      console.error('Error checking tab_permissions column:', error)
    } else {
      console.log('tab_permissions column already exists')
    }
  } catch (error) {
    console.error('Error ensuring tab_permissions column:', error)
  }
}

// Service Management Functions

export async function fetchServices(): Promise<Service[]> {
  if (!supabase) {
    console.warn('Supabase not configured - running in demo mode')
    return []
  }

  try {
    console.log('Fetching services from Supabase...')
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    console.log('Supabase services response:', { data, error })

    if (error) {
      console.error('Error fetching services:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching services:', error)
    return []
  }
}

export async function fetchServicesWithCompanyStatus(companyId?: string): Promise<ServiceWithCompanyStatus[]> {
  if (!supabase) {
    console.warn('Supabase not configured - running in demo mode')
    return []
  }

  try {
    await setAppContext()
    
    // First get all services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      return []
    }

    if (!companyId) {
      return services || []
    }

    // Get company services
    const { data: companyServices, error: companyServicesError } = await supabase
      .from('company_services')
      .select('service_id, is_active')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (companyServicesError) {
      console.error('Error fetching company services:', companyServicesError)
      return services || []
    }

    // Create a map of active service IDs for this company
    const activeServiceIds = new Set(
      companyServices?.map(cs => cs.service_id) || []
    )

    // Merge the data
    const servicesWithStatus = services?.map(service => ({
      ...service,
      is_company_active: activeServiceIds.has(service.id)
    })) || []

    return servicesWithStatus
  } catch (error) {
    console.error('Error fetching services with company status:', error)
    return []
  }
}

export async function updateCompanyServices(companyId: string, serviceIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured - running in demo mode')
    return { success: true }
  }

  try {
    // Get current user for permission check
    const currentUser = getCurrentUser()
    
    // Verify user has admin or manager role
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) {
      return { success: false, error: 'Only admins and managers can update company services' }
    }
    
    await setAppContext()

    // Validate inputs
    if (!companyId) {
      console.error('Company ID is required')
      return { success: false, error: 'Company ID is required' }
    }

    if (!Array.isArray(serviceIds)) {
      console.error('Service IDs must be an array')
      return { success: false, error: 'Service IDs must be an array' }
    }

    // Validate that all service IDs exist in the services table
    if (serviceIds.length > 0) {
      const { data: validServices, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .in('id', serviceIds)
      
      if (servicesError) {
        console.error('Error validating service IDs:', servicesError)
        return { success: false, error: `Failed to validate services: ${servicesError.message}` }
      }
      
      const validServiceIds = new Set(validServices?.map(s => s.id) || [])
      const invalidServiceIds = serviceIds.filter(id => !validServiceIds.has(id))
      
      if (invalidServiceIds.length > 0) {
        console.error('Invalid service IDs:', invalidServiceIds)
        return { success: false, error: `Invalid service IDs: ${invalidServiceIds.join(', ')}` }
      }
      
    }

    // First, get all current services for this company (including inactive ones)
    const { data: currentServices, error: fetchError } = await supabase
      .from('company_services')
      .select('service_id, is_active')
      .eq('company_id', companyId)

    if (fetchError) {
      console.error('Error fetching current company services:', fetchError)
      return { success: false, error: `Failed to fetch current services: ${fetchError.message}` }
    }

    const currentServiceIds = new Set(currentServices?.map(cs => cs.service_id) || [])
    const currentActiveServiceIds = new Set(
      currentServices?.filter(cs => cs.is_active === true).map(cs => cs.service_id) || []
    )
    const newServiceIds = new Set(serviceIds)

    // Services to add (in newServiceIds but not in currentActiveServiceIds)
    // Also reactivate services that were previously deactivated
    const servicesToAdd = serviceIds.filter(id => !currentActiveServiceIds.has(id))

    // Services to remove (in currentActiveServiceIds but not in newServiceIds)
    const servicesToRemove = Array.from(currentActiveServiceIds).filter(id => !newServiceIds.has(id))

    // Add new services - try using upsert which sometimes works better with RLS
    if (servicesToAdd.length > 0) {
      // Check if any of these services were previously deactivated
      const servicesToReactivate = servicesToAdd.filter(id => currentServiceIds.has(id))
      const servicesToInsert = servicesToAdd.filter(id => !currentServiceIds.has(id))
      
      // Reactivate previously deactivated services first
      if (servicesToReactivate.length > 0) {
        await setAppContext()
        const { error: reactivateError } = await supabase
          .from('company_services')
          .update({ is_active: true })
          .eq('company_id', companyId)
          .in('service_id', servicesToReactivate)
        
        if (reactivateError) {
          console.error('Error reactivating services:', reactivateError)
          return { success: false, error: `Failed to reactivate services: ${reactivateError.message}` }
        }
      }
      
      // Insert new services
      if (servicesToInsert.length > 0) {
        // Try upsert first (insert or update if exists) - this sometimes bypasses RLS issues
        const servicesToUpsert = servicesToInsert.map(serviceId => ({
          company_id: companyId,
          service_id: serviceId,
          is_active: true
        }))

        // Re-set context before upsert
        await setAppContext()

        // Try upsert with onConflict - this will update if exists, insert if not
        const { data: upsertData, error: upsertError } = await supabase
          .from('company_services')
          .upsert(servicesToUpsert, {
            onConflict: 'company_id,service_id',
            ignoreDuplicates: false
          })
          .select()

        if (upsertError) {
          console.error('Error upserting company services:', upsertError)
          
          // If upsert fails, try individual inserts as fallback
          let hasError = false
          let lastError: Error | null = null
          
          for (const serviceId of servicesToInsert) {
            const serviceToInsertData = {
              company_id: companyId,
              service_id: serviceId,
              is_active: true
            }

            // Re-set context before each insert
            await setAppContext()

            const { error: insertError } = await supabase
              .from('company_services')
              .insert(serviceToInsertData)

            if (insertError) {
              console.error('Error adding company service:', insertError)
              hasError = true
              lastError = insertError
              // Continue trying other services
              continue
            }
          }
          
          if (hasError && lastError) {
            const errorMessage = lastError.message || (lastError as any).code || 'Unknown error'
            
            // If RLS error (42501), provide detailed message with SQL fix suggestion
            if ((lastError as any).code === '42501' || errorMessage.includes('row-level security') || errorMessage.includes('RLS')) {
              return { 
                success: false, 
                error: `Database security policy error (Code 42501): The row-level security (RLS) policy on the 'company_services' table is blocking this operation. Your account has the '${currentUser.role}' role, but the database policy needs to be updated. 

The database administrator needs to update the RLS policy to allow admins and managers to insert/update company_services. The policy should check the user role from the set_user_context function.` 
              }
            }
            
            return { success: false, error: `Failed to add services: ${errorMessage}` }
          }
        }
      }
    }

    // Remove services (deactivate them)
    if (servicesToRemove.length > 0) {

      const { error: updateError } = await supabase
        .from('company_services')
        .update({ is_active: false })
        .eq('company_id', companyId)
        .in('service_id', servicesToRemove)

      if (updateError) {
        console.error('Error removing company services:', updateError)
        return { success: false, error: `Failed to remove services: ${updateError.message}` }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating company services:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: `Failed to update company services: ${errorMessage}` }
  }
}

export async function getCompanyServices(companyId: string): Promise<Service[]> {
  if (!supabase) {
    console.warn('Supabase not configured - running in demo mode')
    return []
  }

  try {
    await setAppContext()
    const { data, error } = await supabase
      .from('company_services')
      .select(`
        service_id,
        is_active,
        services (*)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching company services:', error)
      return []
    }

    // Extract the services from the joined data
    const services = data?.map(item => item.services).filter(Boolean) || []
    return services as unknown as Service[]
  } catch (error) {
    console.error('Error fetching company services:', error)
    return []
  }
} 

// Internal user company management functions
export async function getInternalUserCompanies(userId: string): Promise<{ success: boolean; data?: InternalUserCompany[]; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('internal_user_companies')
      .select(`
        id,
        user_id,
        company_id,
        is_primary,
        assigned_at,
        assigned_by,
        company:companies(id, name, description, industry, is_active, is_partner, created_at, updated_at)
      `)
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('assigned_at', { ascending: true })

    if (error) {
      console.error('Error fetching internal user companies:', error)
      return { success: false, error: error.message || 'Failed to fetch company assignments' }
    }

    // Transform the data to match the interface
    const transformedData: InternalUserCompany[] = (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      company_id: item.company_id,
      is_primary: item.is_primary,
      assigned_at: item.assigned_at,
      assigned_by: item.assigned_by,
      company: Array.isArray(item.company) && item.company.length > 0 ? {
        id: item.company[0].id,
        name: item.company[0].name,
        description: item.company[0].description,
        industry: item.company[0].industry,
        is_active: item.company[0].is_active,
        is_partner: item.company[0].is_partner,
        created_at: item.company[0].created_at,
        updated_at: item.company[0].updated_at
      } : undefined
    }))

    return { success: true, data: transformedData }
  } catch (error) {
    console.error('Error fetching internal user companies:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function assignCompanyToInternalUser(userId: string, companyId: string, isPrimary: boolean = false): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // If this is being set as primary, unset other primary assignments first
    if (isPrimary) {
      const { error: updateError } = await supabase
        .from('internal_user_companies')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true)

      if (updateError) {
        console.error('Error updating existing primary assignments:', updateError)
      }
    }

    const { error } = await supabase
      .from('internal_user_companies')
      .upsert({
        user_id: userId,
        company_id: companyId,
        is_primary: isPrimary,
        assigned_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error assigning company to internal user:', error)
      return { success: false, error: error.message || 'Failed to assign company' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error assigning company to internal user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function removeCompanyFromInternalUser(userId: string, companyId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('internal_user_companies')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId)

    if (error) {
      console.error('Error removing company from internal user:', error)
      return { success: false, error: error.message || 'Failed to remove company assignment' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing company from internal user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function fetchUsersWithCompanies(): Promise<UserWithCompanies[]> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return []
  }

  try {
    // First, fetch all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at, updated_at, is_active, assigned_manager_id, company_id, tab_permissions')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return []
    }

    // For each internal user, fetch their company assignments
    const usersWithCompanies: UserWithCompanies[] = await Promise.all(
      (users || []).map(async (user) => {
        if (user.role === 'internal' && supabase) {
          // Fetch company assignments with company details
          const { data: companyAssignments, error: companyError } = await supabase
            .from('internal_user_companies')
            .select(`
              id,
              user_id,
              company_id,
              is_primary,
              assigned_at,
              assigned_by,
              company:companies(id, name, description, industry, is_active, is_partner, created_at, updated_at)
            `)
            .eq('user_id', user.id)
            .order('is_primary', { ascending: false })

          if (companyError) {
            console.error('Error fetching company assignments:', companyError)
          }

          // Fetch company details for each assignment
          const companiesWithDetails: InternalUserCompany[] = await Promise.all(
            (companyAssignments || []).map(async (assignment) => {
              if (!supabase) {
                // Return a properly typed object even without company data
                return {
                  id: assignment.id,
                  user_id: assignment.user_id,
                  company_id: assignment.company_id,
                  is_primary: assignment.is_primary,
                  assigned_at: assignment.assigned_at,
                  assigned_by: assignment.assigned_by,
                  company: undefined
                } as InternalUserCompany
              }
              
              // If company data is already included in the query result
              if (assignment.company && Array.isArray(assignment.company) && assignment.company.length > 0) {
                const companyData = assignment.company[0]
                return {
                  id: assignment.id,
                  user_id: assignment.user_id,
                  company_id: assignment.company_id,
                  is_primary: assignment.is_primary,
                  assigned_at: assignment.assigned_at,
                  assigned_by: assignment.assigned_by,
                  company: {
                    id: companyData.id,
                    name: companyData.name,
                    description: companyData.description,
                    industry: companyData.industry,
                    is_active: companyData.is_active,
                    is_partner: companyData.is_partner,
                    created_at: companyData.created_at,
                    updated_at: companyData.updated_at
                  }
                } as InternalUserCompany
              }
              
              // Fallback: fetch company details separately
              const { data: company } = await supabase
                .from('companies')
                .select('id, name, description, industry, is_active, is_partner, created_at, updated_at')
                .eq('id', assignment.company_id)
                .single()

              return {
                id: assignment.id,
                user_id: assignment.user_id,
                company_id: assignment.company_id,
                is_primary: assignment.is_primary,
                assigned_at: assignment.assigned_at,
                assigned_by: assignment.assigned_by,
                company: company || undefined
              } as InternalUserCompany
            })
          )

          const primaryCompany = companiesWithDetails.find(assignment => assignment.is_primary)?.company

          return {
            ...user,
            companies: companiesWithDetails.filter(item => item.company !== undefined),
            primary_company: primaryCompany
          } as UserWithCompanies
        } else {
          // For non-internal users, fetch their single company
          if (user.company_id && supabase) {
            const { data: company } = await supabase
              .from('companies')
              .select('id, name, description, industry, is_active, is_partner, created_at, updated_at')
              .eq('id', user.company_id)
              .single()

            return {
              ...user,
              primary_company: company || undefined
            }
          }
          return user
        }
      })
    )

    return usersWithCompanies
  } catch (error) {
    console.error('Error fetching users with companies:', error)
    return []
  }
} 

// ============================================================================
// DOCUMENT MANAGEMENT FUNCTIONS
// ============================================================================

export interface Document {
  id: string
  name: string
  file_path: string
  file_size: number
  file_type: string
  company_id: string
  uploaded_by: string
  folder_path: string
  is_internal?: boolean
  created_at: string
  updated_at: string
}

export interface DocumentFolder {
  id: string
  name: string
  company_id: string | null
  parent_folder_id?: string
  path: string
  created_by: string
  created_at: string
  updated_at: string
  is_system_folder?: boolean
  is_readonly?: boolean
  is_internal?: boolean
}

// Create a new document record
export async function createDocumentRecord(
  name: string,
  filePath: string,
  fileSize: number,
  fileType: string,
  companyId: string,
  folderPath: string = '/',
  userId: string,
  isInternal: boolean = false
): Promise<{ success: boolean; document?: Document; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

      // Build insert data - conditionally include is_internal if column exists
      const insertData: any = {
        name,
        file_path: filePath,
        file_size: fileSize,
        file_type: fileType,
        company_id: companyId,
        uploaded_by: userId,
        folder_path: folderPath
      }

      // Try to include is_internal, but handle gracefully if column doesn't exist
      insertData.is_internal = isInternal

      const { data, error } = await supabase
        .from('documents')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        // If error is about missing is_internal column, retry without it
        if (error.message?.includes('is_internal') || (error as any).code === 'PGRST204') {
          console.warn('is_internal column not found in documents table, creating document without it')
          const { data: retryData, error: retryError } = await supabase
            .from('documents')
            .insert({
              name,
              file_path: filePath,
              file_size: fileSize,
              file_type: fileType,
              company_id: companyId,
              uploaded_by: userId,
              folder_path: folderPath
            })
            .select()
            .single()

          if (retryError) {
            return { success: false, error: retryError.message }
          }

          return { success: true, document: retryData }
        }

        return { success: false, error: error.message }
      }

    // Log activity for file upload
    if (data) {
      await logActivity({
        user_id: userId,
        action_type: 'file_uploaded',
        entity_type: 'document',
        entity_id: data.id,
        description: `Uploaded file "${name}"`,
        metadata: { 
          file_name: name, 
          file_size: fileSize, 
          file_type: fileType,
          folder_path: folderPath,
          is_internal: isInternal
        },
        company_id: companyId,
      })
    }

    return { success: true, document: data }
  } catch (error) {
    return { success: false, error: 'Failed to create document record' }
  }
}

// Update document visibility (internal/external)
export async function updateDocumentVisibility(
  documentId: string,
  isInternal: boolean,
  documentType: 'document' | 'rich'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    await setAppContext()

    const tableName = documentType === 'rich' ? 'rich_documents' : 'documents'
    
    const { error } = await supabase
      .from(tableName)
      .update({
        is_internal: isInternal,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (error) {
      // If error is about missing is_internal column, return helpful error
      if (error.message?.includes('is_internal') || (error as any).code === 'PGRST204') {
        return { success: false, error: 'is_internal column not found. Please run the database migration.' }
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update document visibility' }
  }
}

// Get documents for a company
export async function getCompanyDocuments(
  companyId: string,
  folderPath: string = '/'
): Promise<{ success: boolean; documents?: Document[]; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('folder_path', folderPath)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, documents: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch company documents' }
  }
}

// Get folders for a company
export async function getCompanyFolders(
  companyId: string,
  parentFolderPath?: string
): Promise<{ success: boolean; folders?: DocumentFolder[]; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    let query = supabase
      .from('document_folders')
      .select('*')
      .or(`company_id.eq.${companyId},is_system_folder.eq.true`)

    if (parentFolderPath && parentFolderPath !== '/') {
      // If we have a parent folder path, find the folder with that path and get its ID
      const { data: parentFolders, error: parentError } = await supabase
        .from('document_folders')
        .select('id, company_id')
        .or(`company_id.eq.${companyId},is_system_folder.eq.true`)
        .eq('path', parentFolderPath)

      if (parentError) {
        return { success: false, error: `Parent folder not found: ${parentError.message}` }
      }

      // Check if we found exactly one parent folder
      if (!parentFolders || parentFolders.length === 0) {
        // If parent folder not found, return empty result
        return { success: true, folders: [] }
      }

      if (parentFolders.length > 1) {
        // If multiple folders found, use the first one (company-specific takes precedence)
        const companyFolder = parentFolders.find(folder => folder.company_id === companyId)
        const parentFolder = companyFolder || parentFolders[0]
        query = query.eq('parent_folder_id', parentFolder.id)
      } else {
        // Single folder found
        query = query.eq('parent_folder_id', parentFolders[0].id)
      }
    } else {
      // Root level folders (no parent)
      query = query.is('parent_folder_id', null)
    }

    const { data, error } = await query.order('name', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, folders: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch company folders' }
  }
}

// Ensure the "Setup Instructions" system folder exists
export async function ensureSetupInstructionsFolder(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Check if the Setup Instructions folder already exists
    const { data: existingFolder, error: checkError } = await supabase
      .from('document_folders')
      .select('id')
      .eq('name', 'Setup Instructions')
      .eq('is_system_folder', true)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      return { success: false, error: `Error checking for existing folder: ${checkError.message}` }
    }

    // If folder doesn't exist, create it
    if (!existingFolder) {
      const { error: createError } = await supabase
        .from('document_folders')
        .insert({
          name: 'Setup Instructions',
          company_id: null,
          parent_folder_id: null,
          path: '/Setup Instructions',
          created_by: userId,
          is_system_folder: true,
          is_readonly: true
        })

      if (createError) {
        return { success: false, error: `Error creating Setup Instructions folder: ${createError.message}` }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to ensure Setup Instructions folder exists' }
  }
}

// Create a system folder that will be visible to all companies
export async function createSystemFolder(
  name: string,
  userId: string,
  isReadonly: boolean = true
): Promise<{ success: boolean; folder?: DocumentFolder; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Set application context for RLS
    await setAppContext()

    const { data, error } = await supabase
      .from('document_folders')
      .insert({
        name,
        company_id: null,
        parent_folder_id: null,
        path: `/${name}`,
        created_by: userId,
        is_system_folder: true,
        is_readonly: isReadonly
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, folder: data }
  } catch (error) {
    return { success: false, error: 'Failed to create system folder' }
  }
}

// Create a new folder
export async function createFolder(
  name: string,
  companyId: string,
  userId: string,
  parentFolderId?: string,
  isInternal: boolean = false
): Promise<{ success: boolean; folder?: DocumentFolder; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    console.log('Creating folder with params:', { name, companyId, userId, parentFolderId })

    // Set application context for RLS
    await setAppContext()

    // Build path
    let path = `/${name}`
    let finalIsInternal = isInternal
    if (parentFolderId) {
      // Get parent folder path and check if it's a system folder
      const { data: parentFolder, error: parentError } = await supabase
        .from('document_folders')
        .select('path, is_system_folder, is_readonly, is_internal')
        .eq('id', parentFolderId)
        .single()
      
      if (parentError) {
        // If error is about missing is_internal column, retry without it
        if (parentError.message?.includes('is_internal') || (parentError as any).code === 'PGRST204') {
          const { data: retryParentFolder, error: retryParentError } = await supabase
            .from('document_folders')
            .select('path, is_system_folder, is_readonly')
            .eq('id', parentFolderId)
            .single()
          
          if (retryParentError) {
            return { success: false, error: `Parent folder error: ${retryParentError.message}` }
          }
          
          if (retryParentFolder) {
            if (retryParentFolder.is_system_folder && retryParentFolder.is_readonly) {
              return { success: false, error: 'Cannot create folders inside readonly system folders' }
            }
            path = `${retryParentFolder.path}/${name}`
            // is_internal column doesn't exist, so we can't inherit it
            finalIsInternal = false
          }
        } else {
          return { success: false, error: `Parent folder error: ${parentError.message}` }
        }
      } else if (parentFolder) {
        // Check if parent is a readonly system folder
        if (parentFolder.is_system_folder && parentFolder.is_readonly) {
          return { success: false, error: 'Cannot create folders inside readonly system folders' }
        }
        
        path = `${parentFolder.path}/${name}`
        // Inherit internal status from parent if parent is internal (if column exists)
        if (parentFolder.is_internal === true) {
          finalIsInternal = true
        }
      }
    }

    console.log('Folder path will be:', path)

    // Check if user has access to this company using users.company_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error checking user company access:', userError)
      // Continue anyway - let RLS handle the security
    } else {
      console.log('User company access verified:', user)
      
      // Admins and managers can create folders in any company
      if (user.role === 'admin' || user.role === 'manager') {
        console.log('Admin/Manager creating folder in company:', companyId)
        // Allow access to any company
      } else {
        // Regular users can only create folders in their own company
        if (user.company_id !== companyId) {
          console.error('Regular user trying to create folder in different company')
          return { success: false, error: 'You can only create folders in your own company' }
        }
      }
    }

    // Build insert data - conditionally include is_internal if column exists
    const insertData: any = {
      name,
      company_id: companyId,
      parent_folder_id: parentFolderId,
      path,
      created_by: userId
    }

    // Only include is_internal if the column exists (will be added via migration)
    // For now, we'll try to include it and handle the error gracefully
    try {
      insertData.is_internal = finalIsInternal
    } catch {
      // Column doesn't exist yet, skip it
    }

    const { data, error } = await supabase
      .from('document_folders')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      // If error is about missing is_internal column, retry without it
      if (error.message?.includes('is_internal') || (error as any).code === 'PGRST204') {
        console.warn('is_internal column not found, creating folder without it')
        const { data: retryData, error: retryError } = await supabase
          .from('document_folders')
          .insert({
            name,
            company_id: companyId,
            parent_folder_id: parentFolderId,
            path,
            created_by: userId
          })
          .select()
          .single()

        if (retryError) {
          console.error('Error creating folder in database:', retryError)
          return { success: false, error: `Database error: ${retryError.message || 'Unknown error'}` }
        }

        return { success: true, folder: retryData }
      }

      console.error('Error creating folder in database:', error)
      console.error('Error details:', {
        code: (error as any).code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return { success: false, error: `Database error: ${error.message || 'Unknown error'}` }
    }

    console.log('Folder created successfully:', data)
    
    // Log activity for folder creation
    if (data) {
      await logActivity({
        user_id: userId,
        action_type: 'folder_created',
        entity_type: 'folder',
        entity_id: data.id,
        description: `Created folder "${name}"`,
        metadata: { 
          folder_name: name, 
          folder_path: path,
          parent_folder_id: parentFolderId || null,
          is_internal: finalIsInternal
        },
        company_id: companyId,
      })
    }
    
    return { success: true, folder: data }
  } catch (error) {
    console.error('Unexpected error in createFolder:', error)
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Delete a document
export async function deleteDocument(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // First get the document to check if it's a system document
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path, name')
      .eq('id', documentId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    // Prevent deletion of system onboarding document
    if (document.name === 'Onboarding_Doc.pdf' || document.name === 'Onboarding Doc.pdf') {
      return { success: false, error: 'This is a system document and cannot be deleted' }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path])

    if (storageError) {
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      return { success: false, error: dbError.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete document' }
  }
}

// Delete a folder and all its contents
export async function deleteFolder(
  folderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Get folder path and check if it's a system folder
    const { data: folder, error: fetchError } = await supabase
      .from('document_folders')
      .select('path, company_id, is_system_folder, is_readonly')
      .eq('id', folderId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    // Prevent deletion of readonly system folders
    if (folder.is_system_folder && folder.is_readonly) {
      return { success: false, error: 'Cannot delete readonly system folders' }
    }

    // Delete all documents in this folder and subfolders
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('file_path')
      .like('folder_path', `${folder.path}%`)

    if (docsError) {
      return { success: false, error: docsError.message }
    }

    // Delete files from storage
    if (documents && documents.length > 0) {
      const filePaths = documents.map(doc => doc.file_path)
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove(filePaths)

      if (storageError) {
        // Continue with deletion even if storage deletion fails
      }
    }

    // Delete all subfolders
    await supabase
      .from('document_folders')
      .delete()
      .like('path', `${folder.path}%`)

    // Delete all documents in this folder structure
    await supabase
      .from('documents')
      .delete()
      .like('folder_path', `${folder.path}%`)

    // Delete the main folder
    const { error: folderError } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', folderId)

    if (folderError) {
      return { success: false, error: folderError.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete folder' }
  }
}

// Update folder name
export async function updateFolder(
  folderId: string,
  newName: string
): Promise<{ success: boolean; folder?: DocumentFolder; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Validate folder name
    if (!newName.trim()) {
      return { success: false, error: 'Folder name cannot be empty' }
    }

    if (newName.length > 255) {
      return { success: false, error: 'Folder name is too long (maximum 255 characters)' }
    }

    if (/[<>:"/\\|?*]/.test(newName)) {
      return { success: false, error: 'Folder name contains invalid characters' }
    }

    // Get current folder info
    const { data: folder, error: fetchError } = await supabase
      .from('document_folders')
      .select('path, company_id, is_system_folder, is_readonly, parent_folder_id')
      .eq('id', folderId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    // Prevent editing readonly system folders
    if (folder.is_system_folder && folder.is_readonly) {
      return { success: false, error: 'Cannot edit readonly system folders' }
    }

    // Build new path
    let newPath = `/${newName.trim()}`
    if (folder.parent_folder_id) {
      // Get parent folder path
      const { data: parentFolder, error: parentError } = await supabase
        .from('document_folders')
        .select('path')
        .eq('id', folder.parent_folder_id)
        .single()

      if (parentError) {
        return { success: false, error: `Parent folder error: ${parentError.message}` }
      }

      if (parentFolder) {
        newPath = `${parentFolder.path}/${newName.trim()}`
      }
    }

    // Update folder name and path
    const { data: updatedFolder, error: updateError } = await supabase
      .from('document_folders')
      .update({
        name: newName.trim(),
        path: newPath,
        updated_at: new Date().toISOString()
      })
      .eq('id', folderId)
      .select()
      .single()

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Update all subfolders' paths
    const { data: subfolders } = await supabase
      .from('document_folders')
      .select('id, path')
      .like('path', `${folder.path}%`)
      .neq('id', folderId)

    if (subfolders && subfolders.length > 0) {
      for (const subfolder of subfolders) {
        const newSubfolderPath = subfolder.path.replace(folder.path, newPath)
        await supabase
          .from('document_folders')
          .update({ path: newSubfolderPath })
          .eq('id', subfolder.id)
      }
    }

    // Update all documents' folder_path
    await supabase
      .from('documents')
      .update({ folder_path: newPath })
      .eq('folder_path', folder.path)

    // Update documents in subfolders
    if (subfolders && subfolders.length > 0) {
      for (const subfolder of subfolders) {
        const newSubfolderPath = subfolder.path.replace(folder.path, newPath)
        await supabase
          .from('documents')
          .update({ folder_path: newSubfolderPath })
          .eq('folder_path', subfolder.path)
      }
    }

    // Update rich documents' folder_path
    await supabase
      .from('rich_documents')
      .update({ folder_path: newPath })
      .eq('folder_path', folder.path)

    // Update rich documents in subfolders
    if (subfolders && subfolders.length > 0) {
      for (const subfolder of subfolders) {
        const newSubfolderPath = subfolder.path.replace(folder.path, newPath)
        await supabase
          .from('rich_documents')
          .update({ folder_path: newSubfolderPath })
          .eq('folder_path', subfolder.path)
      }
    }

    return { success: true, folder: updatedFolder }
  } catch (error) {
    return { success: false, error: 'Failed to update folder' }
  }
}

// Move a document to a folder
export async function moveDocumentToFolder(
  documentId: string,
  documentType: 'document' | 'rich',
  targetFolderPath: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const tableName = documentType === 'document' ? 'documents' : 'rich_documents'
    
    // Get document info before moving for activity log
    const { data: document, error: fetchError } = await supabase
      .from(tableName)
      .select('name, company_id, folder_path')
      .eq('id', documentId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    const { error } = await supabase
      .from(tableName)
      .update({ folder_path: targetFolderPath })
      .eq('id', documentId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Log activity for document move (if userId provided)
    if (userId && document) {
      await logActivity({
        user_id: userId,
        action_type: 'document_moved',
        entity_type: documentType === 'document' ? 'document' : 'rich_document',
        entity_id: documentId,
        description: `Moved ${documentType === 'document' ? 'document' : 'rich document'} "${document.name}" to "${targetFolderPath}"`,
        metadata: { 
          document_name: document.name,
          from_folder: document.folder_path || '/',
          to_folder: targetFolderPath,
          document_type: documentType
        },
        company_id: document.company_id,
      })
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to move document' }
  }
}

// Get document by ID
export async function getDocumentById(
  documentId: string
): Promise<{ success: boolean; document?: Document; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, document: data }
  } catch (error) {
    return { success: false, error: 'Failed to fetch document' }
  }
}

// Get folder by ID
export async function getFolderById(
  folderId: string
): Promise<{ success: boolean; folder?: DocumentFolder; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .eq('id', folderId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, folder: data }
  } catch (error) {
    return { success: false, error: 'Failed to fetch folder' }
  }
}

// Search documents by name
export async function searchDocuments(
  companyId: string,
  searchTerm: string
): Promise<{ success: boolean; documents?: Document[]; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', companyId)
      .ilike('name', `%${searchTerm}%`)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, documents: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to search documents' }
  }
}

// Get storage usage for a company
export async function getCompanyStorageUsage(
  companyId: string
): Promise<{ success: boolean; usage?: number; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('documents')
      .select('file_size')
      .eq('company_id', companyId)

    if (error) {
      return { success: false, error: error.message }
    }

    const totalUsage = data?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0
    return { success: true, usage: totalUsage }
  } catch (error) {
    return { success: false, error: 'Failed to fetch storage usage' }
  }
}

// Favorites functions
export async function addToFavorites(
  userId: string,
  itemId: string,
  itemType: 'document' | 'folder',
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: userId,
        item_id: itemId,
        item_type: itemType,
        company_id: companyId
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to add to favorites' }
  }
}

export async function removeFromFavorites(
  userId: string,
  itemId: string,
  itemType: 'document' | 'folder'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', itemType)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to remove from favorites' }
  }
}

export async function getUserFavorites(
  userId: string,
  companyId: string
): Promise<{ success: boolean; favorites?: Array<{ id: string; item_id: string; item_type: 'document' | 'folder' }>; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select('id, item_id, item_type')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, favorites: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch favorites' }
  }
}

export async function isFavorited(
  userId: string,
  itemId: string,
  itemType: 'document' | 'folder'
): Promise<{ success: boolean; isFavorited?: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .single()

    if (error && (error as any).code !== 'PGRST116') {
      return { success: false, error: error.message }
    }

    return { success: true, isFavorited: !!data }
  } catch (error) {
    return { success: false, error: 'Failed to check favorite status' }
  }
}

// Space Bookmarks functions
export interface SpaceBookmark {
  id: string
  company_id: string
  name: string
  url: string
  icon_name: string
  color: string
  favicon_url?: string | null
  position: number
  created_by?: string | null
  created_at: string
  updated_at: string
}

export async function fetchSpaceBookmarks(
  companyId: string
): Promise<{ success: boolean; bookmarks?: SpaceBookmark[]; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // RLS removed - using custom access control in application code
    const { data, error } = await supabase
      .from('space_bookmarks')
      .select('*')
      .eq('company_id', companyId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, bookmarks: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch space bookmarks' }
  }
}

export async function createSpaceBookmark(
  companyId: string,
  bookmarkData: {
    name: string
    url: string
    icon_name?: string
    color?: string
    favicon_url?: string
    position?: number
  },
  userId: string
): Promise<{ success: boolean; bookmark?: SpaceBookmark; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Custom admin access check - remove RLS dependency
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Verify user has access to this company
    // Admins can create bookmarks in any company
    // Managers and other users can only create bookmarks in their own company
    if (currentUser.role !== 'admin') {
      if (currentUser.companyId !== companyId) {
        return { success: false, error: 'You can only create bookmarks in your own company' }
      }
    }

    // Get the maximum position for this company to add at the end
    const { data: existingBookmarks } = await supabase
      .from('space_bookmarks')
      .select('position')
      .eq('company_id', companyId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const maxPosition = existingBookmarks?.position ?? -1
    const newPosition = maxPosition + 1

    const { data, error } = await supabase
      .from('space_bookmarks')
      .insert({
        company_id: companyId,
        name: bookmarkData.name,
        url: bookmarkData.url,
        icon_name: bookmarkData.icon_name || 'ExternalLink',
        color: bookmarkData.color || '#6b7280',
        favicon_url: bookmarkData.favicon_url || null,
        position: bookmarkData.position ?? newPosition,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, bookmark: data }
  } catch (error) {
    return { success: false, error: 'Failed to create space bookmark' }
  }
}

export async function updateSpaceBookmark(
  bookmarkId: string,
  bookmarkData: {
    name?: string
    url?: string
    icon_name?: string
    color?: string
    favicon_url?: string
    position?: number
  }
): Promise<{ success: boolean; bookmark?: SpaceBookmark; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Custom admin access check - remove RLS dependency
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // First, get the bookmark to check company access
    const { data: existingBookmark, error: fetchError } = await supabase
      .from('space_bookmarks')
      .select('company_id, created_by')
      .eq('id', bookmarkId)
      .single()

    if (fetchError || !existingBookmark) {
      return { success: false, error: 'Bookmark not found' }
    }

    // Verify user has access to this bookmark's company
    // Admins can update any bookmark
    // Managers and other users can only update bookmarks in their own company
    if (currentUser.role !== 'admin') {
      if (currentUser.companyId !== existingBookmark.company_id) {
        return { success: false, error: 'You can only update bookmarks in your own company' }
      }
    }

    const { data, error } = await supabase
      .from('space_bookmarks')
      .update({
        ...(bookmarkData.name && { name: bookmarkData.name }),
        ...(bookmarkData.url && { url: bookmarkData.url }),
        ...(bookmarkData.icon_name && { icon_name: bookmarkData.icon_name }),
        ...(bookmarkData.color && { color: bookmarkData.color }),
        ...(bookmarkData.favicon_url !== undefined && { favicon_url: bookmarkData.favicon_url }),
        ...(bookmarkData.position !== undefined && { position: bookmarkData.position }),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookmarkId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, bookmark: data }
  } catch (error) {
    return { success: false, error: 'Failed to update space bookmark' }
  }
}

export async function deleteSpaceBookmark(
  bookmarkId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Custom admin access check - remove RLS dependency
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // First, get the bookmark to check company access
    const { data: existingBookmark, error: fetchError } = await supabase
      .from('space_bookmarks')
      .select('company_id, created_by')
      .eq('id', bookmarkId)
      .single()

    if (fetchError || !existingBookmark) {
      return { success: false, error: 'Bookmark not found' }
    }

    // Verify user has access to this bookmark's company
    // Admins can delete any bookmark
    // Managers and other users can only delete bookmarks in their own company
    if (currentUser.role !== 'admin') {
      if (currentUser.companyId !== existingBookmark.company_id) {
        return { success: false, error: 'You can only delete bookmarks in your own company' }
      }
    }

    const { error } = await supabase
      .from('space_bookmarks')
      .delete()
      .eq('id', bookmarkId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete space bookmark' }
  }
}

// User Invitation System Functions
export async function createUserInvitation(invitationData: {
  email: string
  full_name: string
  company_id: string
  role: 'admin' | 'manager' | 'user' | 'internal'
  invited_by: string
  tab_permissions?: string[]
}): Promise<{ success: boolean; data?: UserInvitation; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    // Generate a unique invitation token
    const invitationToken = crypto.randomUUID()
    
    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    
    const { data, error } = await supabase
      .from('user_invitations')
      .insert({
        email: invitationData.email,
        full_name: invitationData.full_name,
        company_id: invitationData.company_id,
        role: invitationData.role,
        invited_by: invitationData.invited_by,
        invitation_token: invitationToken,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        tab_permissions: invitationData.tab_permissions || []
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message || 'Failed to create invitation' }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'Failed to create invitation' }
  }
}

export async function createBulkUserInvitations(invitations: Array<{
  email: string
  full_name: string
  company_id: string
  role: 'admin' | 'manager' | 'user' | 'internal'
  invited_by: string
  tab_permissions?: string[]
}>): Promise<{ success: boolean; data?: UserInvitation[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const invitationData = invitations.map(invitation => {
      const invitationToken = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)
      
      return {
        email: invitation.email,
        full_name: invitation.full_name,
        company_id: invitation.company_id,
        role: invitation.role,
        invited_by: invitation.invited_by,
        invitation_token: invitationToken,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        tab_permissions: invitation.tab_permissions || []
      }
    })
    
    const { data, error } = await supabase
      .from('user_invitations')
      .insert(invitationData)
      .select()

    if (error) {
      console.error('Error creating bulk user invitations:', error)
      return { success: false, error: error.message || 'Failed to create invitations' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error creating bulk user invitations:', error)
    return { success: false, error: 'Failed to create invitations' }
  }
}

export async function getInvitationByToken(token: string): Promise<{ success: boolean; data?: UserInvitation; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('status', 'pending')
      .single()

    if (error) {
      return { success: false, error: error.message || 'Invitation not found' }
    }

    // Check if invitation has expired
    if (new Date(data.expires_at) < new Date()) {
      return { success: false, error: 'Invitation has expired' }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'Failed to get invitation' }
  }
}

export async function acceptInvitation(token: string, password: string): Promise<{ success: boolean; data?: User; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    // Get the invitation
    const invitationResult = await getInvitationByToken(token)
    if (!invitationResult.success || !invitationResult.data) {
      return { success: false, error: 'Invalid or expired invitation' }
    }

    const invitation = invitationResult.data

    // Create the user
    const userData = {
      email: invitation.email,
      full_name: invitation.full_name,
      role: invitation.role,
      password: password,
      company_id: invitation.company_id,
      tab_permissions: invitation.tab_permissions
    }

    const userResult = await createUser(userData)
    if (!userResult.success || !userResult.data) {
      return { success: false, error: userResult.error || 'Failed to create user' }
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('invitation_token', token)

    if (updateError) {
      console.error('Error updating invitation status:', updateError)
      // Don't fail the whole operation if this fails
    }

    return { success: true, data: userResult.data }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return { success: false, error: 'Failed to accept invitation' }
  }
}

export async function getPendingInvitations(companyId?: string): Promise<{ success: boolean; data?: UserInvitation[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    let query = supabase
      .from('user_invitations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message || 'Failed to fetch invitations' }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'Failed to fetch invitations' }
  }
}

export async function cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const { error } = await supabase
      .from('user_invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId)

    if (error) {
      return { success: false, error: error.message || 'Failed to cancel invitation' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to cancel invitation' }
  }
}

// Historical Data Storage Functions

export async function storeSystemMetrics(metrics: Omit<SystemMetrics, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const { error } = await supabase
      .from('system_metrics')
      .insert([metrics])

    if (error) {
      return { success: false, error: `Failed to store system metrics: ${error.message}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while storing system metrics' }
  }
}

export async function storePerformanceMetrics(metrics: Omit<PerformanceMetrics, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const { error } = await supabase
      .from('performance_metrics')
      .insert([metrics])

    if (error) {
      return { success: false, error: `Failed to store performance metrics: ${error.message}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while storing performance metrics' }
  }
}

export async function getSystemMetricsHistory(
  hours: number = 24,
  limit: number = 1000
): Promise<{ success: boolean; data?: SystemMetrics[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('system_metrics')
      .select('*')
      .gte('timestamp', cutoffTime)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: `Failed to fetch system metrics: ${error.message}` }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while fetching system metrics' }
  }
}

export async function getPerformanceMetricsHistory(
  hours: number = 24,
  limit: number = 1000
): Promise<{ success: boolean; data?: PerformanceMetrics[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .gte('timestamp', cutoffTime)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      return { success: false, error: `Failed to fetch performance metrics: ${error.message}` }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while fetching performance metrics' }
  }
}

export async function cleanupOldMetrics(daysToKeep: number = 30): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString()
    
    // Clean up system metrics
    const { error: systemError } = await supabase
      .from('system_metrics')
      .delete()
      .lt('timestamp', cutoffTime)

    if (systemError) {
      return { success: false, error: `Failed to cleanup system metrics: ${systemError.message}` }
    }

    // Clean up performance metrics
    const { error: performanceError } = await supabase
      .from('performance_metrics')
      .delete()
      .lt('timestamp', cutoffTime)

    if (performanceError) {
      return { success: false, error: `Failed to cleanup performance metrics: ${performanceError.message}` }
    }

    const totalDeleted = 0 // We can't get exact count with this approach
    return { success: true, deletedCount: totalDeleted }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while cleaning up metrics' }
  }
}

export async function getMetricsSummary(
  hours: number = 24
): Promise<{ 
  success: boolean; 
  data?: {
    avgMemoryUsage: number
    avgCpuUsage: number
    avgResponseTime: number
    avgErrorRate: number
    totalRequests: number
    cacheHitRate: number
    peakActiveUsers: number
    avgUserEngagement: number
  }; 
  error?: string 
}> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    await setAppContext()
    
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('system_metrics')
      .select('memory_usage, cpu_usage, response_time, error_rate, total_requests, cache_hits, cache_misses, active_users, user_engagement')
      .gte('timestamp', cutoffTime)

    if (error) {
      return { success: false, error: `Failed to fetch metrics summary: ${error.message}` }
    }

    if (!data || data.length === 0) {
      return { success: true, data: {
        avgMemoryUsage: 0,
        avgCpuUsage: 0,
        avgResponseTime: 0,
        avgErrorRate: 0,
        totalRequests: 0,
        cacheHitRate: 0,
        peakActiveUsers: 0,
        avgUserEngagement: 0
      }}
    }

    const summary = {
      avgMemoryUsage: data.reduce((sum, m) => sum + m.memory_usage, 0) / data.length,
      avgCpuUsage: data.reduce((sum, m) => sum + m.cpu_usage, 0) / data.length,
      avgResponseTime: data.reduce((sum, m) => sum + m.response_time, 0) / data.length,
      avgErrorRate: data.reduce((sum, m) => sum + m.error_rate, 0) / data.length,
      totalRequests: Math.max(...data.map(m => m.total_requests)),
      cacheHitRate: data.reduce((sum, m) => sum + (m.cache_hits / (m.cache_hits + m.cache_misses)), 0) / data.length * 100,
      peakActiveUsers: Math.max(...data.map(m => m.active_users)),
      avgUserEngagement: data.reduce((sum, m) => sum + m.user_engagement, 0) / data.length
    }

    return { success: true, data: summary }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred while calculating metrics summary' }
  }
}

// ============================================================================
// RICH DOCUMENT FUNCTIONS
// ============================================================================

export interface RichDocument {
  id: string
  title: string
  content: string
  company_id: string
  created_by: string
  folder_path: string
  is_internal?: boolean
  created_at: string
  updated_at: string
}

// Create or update a rich document
export async function saveRichDocument(
  title: string,
  content: string,
  companyId: string,
  userId: string,
  folderPath: string = '/',
  documentId?: string,
  isInternal: boolean = false
): Promise<{ success: boolean; document?: RichDocument; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Get current user for validation
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Application-level security: Verify user has access to this company
    if (documentId) {
      // For updates, verify the document exists and user created it
      const { data: existingDoc } = await supabase
        .from('rich_documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (!existingDoc) {
        return { success: false, error: 'Document not found' }
      }

      if (existingDoc.created_by !== currentUser.id) {
        return { success: false, error: 'You can only edit documents you created' }
      }

      // Update existing document - include is_internal if updating
      const updateData: any = {
        title,
        content,
        updated_at: new Date().toISOString()
      }
      
      // Include is_internal if it was passed (for updates that change visibility)
      if (isInternal !== undefined) {
        updateData.is_internal = isInternal
      }

      const { data, error } = await supabase
        .from('rich_documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, document: data }
    } else {
      // For new documents, verify user has access to this company
      // Admins can create documents in any company
      const hasAccess = 
        currentUser.role === 'admin' ||
        currentUser.companyId === companyId ||
        (currentUser.role === 'internal' && currentUser.companyIds?.includes(companyId)) ||
        (currentUser.role === 'manager' && currentUser.companyId === companyId)

      if (!hasAccess) {
        return { success: false, error: 'Access denied to this company' }
      }

      // Create new document - conditionally include is_internal
      const insertData: any = {
        title,
        content,
        company_id: companyId,
        created_by: userId,
        folder_path: folderPath
      }

      // Try to include is_internal, but handle gracefully if column doesn't exist
      insertData.is_internal = isInternal

      const { data, error } = await supabase
        .from('rich_documents')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        // If error is about missing is_internal column, retry without it
        if (error.message?.includes('is_internal') || (error as any).code === 'PGRST204') {
          console.warn('is_internal column not found in rich_documents table, creating document without it')
          const { data: retryData, error: retryError } = await supabase
            .from('rich_documents')
            .insert({
              title,
              content,
              company_id: companyId,
              created_by: userId,
              folder_path: folderPath
            })
            .select()
            .single()

          if (retryError) {
            return { success: false, error: retryError.message }
          }

          return { success: true, document: retryData }
        }

        return { success: false, error: error.message || 'Failed to create document' }
      }

      if (!data) {
        return { success: false, error: 'Failed to create document' }
      }

      // Log activity for rich document creation
      await logActivity({
        user_id: userId,
        action_type: 'rich_document_created',
        entity_type: 'rich_document',
        entity_id: data.id,
        description: `Created rich document "${title}"`,
        metadata: { 
          title: title,
          folder_path: folderPath,
          is_internal: isInternal
        },
        company_id: companyId,
      })

      return { success: true, document: data }
    }
  } catch (error) {
    return { success: false, error: 'Failed to save rich document' }
  }
}

// Get rich documents for a company
export async function getCompanyRichDocuments(
  companyId: string,
  folderPath: string = '/'
): Promise<{ success: boolean; documents?: RichDocument[]; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Get current user for validation
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Application-level security: Verify user has access to this company
    // Admins can access any company
    // Users can access their own company
    // Internal users can access companies they're assigned to
    const hasAccess = 
      currentUser.role === 'admin' ||
      currentUser.companyId === companyId ||
      (currentUser.role === 'internal' && currentUser.companyIds?.includes(companyId)) ||
      (currentUser.role === 'manager' && currentUser.companyId === companyId)

    if (!hasAccess) {
      return { success: false, error: 'Access denied to this company' }
    }

    const { data, error } = await supabase
      .from('rich_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('folder_path', folderPath)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, documents: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch rich documents' }
  }
}

// Get a single rich document by ID
export async function getRichDocument(
  documentId: string
): Promise<{ success: boolean; document?: RichDocument; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Get current user for validation
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('rich_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'Document not found' }
    }

    // Application-level security: Verify user has access to this company
    // Admins can view any document
    const hasAccess = 
      currentUser.role === 'admin' ||
      currentUser.companyId === data.company_id ||
      (currentUser.role === 'internal' && currentUser.companyIds?.includes(data.company_id)) ||
      (currentUser.role === 'manager' && currentUser.companyId === data.company_id)

    if (!hasAccess) {
      return { success: false, error: 'Access denied to this document' }
    }

    return { success: true, document: data }
  } catch (error) {
    return { success: false, error: 'Failed to fetch rich document' }
  }
}

// Delete a rich document
export async function deleteRichDocument(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Get current user for validation
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Verify the document exists and user created it
    const { data: existingDoc } = await supabase
      .from('rich_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (!existingDoc) {
      return { success: false, error: 'Document not found' }
    }

    // Prevent deletion of system onboarding document
    if (existingDoc.title === 'Onboarding_Doc.pdf' || existingDoc.title === 'Onboarding Doc.pdf') {
      return { success: false, error: 'This is a system document and cannot be deleted' }
    }

    if (existingDoc.created_by !== currentUser.id) {
      return { success: false, error: 'You can only delete documents you created' }
    }

    const { error } = await supabase
      .from('rich_documents')
      .delete()
      .eq('id', documentId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete rich document' }
  }
}

export interface RecentActivity {
  id: string
  type: string // Expanded to support all action types
  user_id: string
  user_name: string
  user_email?: string
  timestamp: string
  project_id?: string
  project_name?: string
  company_name?: string
  task_id?: string
  task_title?: string
  comment_content?: string
  description?: string
  metadata?: Record<string, unknown>
}

export async function fetchRecentActivities(limit: number = 50, daysBack: number = 90): Promise<RecentActivity[]> {
  if (!supabase) return []

  try {
    await setAppContext()
    
    // Calculate date threshold
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - daysBack)

    // Try to fetch from activity_logs table first (new approach)
    const { data: activityLogs, error: logsError } = await supabase
      .from('activity_logs')
      .select(`
        id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        description,
        metadata,
        company_id,
        project_id,
        task_id,
        created_at,
        user:users!activity_logs_user_id_fkey(id, full_name, email),
        company:companies!activity_logs_company_id_fkey(id, name),
        project:projects!activity_logs_project_id_fkey(id, name),
        task:tasks!activity_logs_task_id_fkey(id, title)
      `)
      .gte('created_at', dateThreshold.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    // If activity_logs table exists and has data, use it
    if (!logsError && activityLogs && activityLogs.length > 0) {
      return activityLogs.map(log => ({
        id: log.id,
        type: log.action_type,
        user_id: log.user_id,
        user_name: (log.user as any)?.full_name || 'Unknown',
        user_email: (log.user as any)?.email,
        timestamp: log.created_at,
        project_id: log.project_id,
        project_name: (log.project as any)?.name,
        company_name: (log.company as any)?.name,
        task_id: log.task_id,
        task_title: (log.task as any)?.title,
        description: log.description,
        metadata: log.metadata || {},
      }))
    }

    // Fallback to old method if activity_logs table doesn't exist or is empty
    const activities: RecentActivity[] = []
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // Fetch recent projects
    const { data: recentProjects } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        created_at,
        created_by,
        company_id,
        created_user:users!projects_created_by_fkey(id, full_name, email),
        company:companies!projects_company_id_fkey(id, name)
      `)
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (recentProjects) {
      recentProjects.forEach(project => {
        activities.push({
          id: `project-${project.id}`,
          type: 'project_created',
          user_id: project.created_by,
          user_name: (project.created_user as any)?.full_name || 'Unknown',
          user_email: (project.created_user as any)?.email,
          timestamp: project.created_at,
          project_id: project.id,
          project_name: project.name,
          company_name: (project.company as any)?.name
        })
      })
    }

    // Fetch recent tasks (created and completed)
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        created_by,
        project_id,
        created_user:users!tasks_created_by_fkey(id, full_name, email),
        project:projects!tasks_project_id_fkey(id, name, company_id, company:companies!projects_company_id_fkey(id, name))
      `)
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit * 2)
    
    // Also fetch recently completed tasks
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        created_by,
        project_id,
        created_user:users!tasks_created_by_fkey(id, full_name, email),
        project:projects!tasks_project_id_fkey(id, name, company_id, company:companies!projects_company_id_fkey(id, name))
      `)
      .eq('status', 'done')
      .gte('updated_at', oneWeekAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(limit)
    
    const allRecentTasks = [...(recentTasks || []), ...(completedTasks || [])]
    const uniqueTasks = Array.from(
      new Map(allRecentTasks.map(task => [task.id, task])).values()
    )

    if (uniqueTasks.length > 0) {
      uniqueTasks.forEach(task => {
        const isCompleted = task.status === 'done'
        const isNew = new Date(task.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        const wasRecentlyCompleted = isCompleted && new Date(task.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        if (isNew && !wasRecentlyCompleted) {
          activities.push({
            id: `task-created-${task.id}`,
            type: 'task_created',
            user_id: task.created_by,
            user_name: (task.created_user as any)?.full_name || 'Unknown',
            user_email: (task.created_user as any)?.email,
            timestamp: task.created_at,
            project_id: task.project_id,
            project_name: (task.project as any)?.name,
            company_name: (task.project as any)?.company?.name,
            task_id: task.id,
            task_title: task.title
          })
        } else if (wasRecentlyCompleted) {
          activities.push({
            id: `task-completed-${task.id}`,
            type: 'task_completed',
            user_id: task.created_by,
            user_name: (task.created_user as any)?.full_name || 'Unknown',
            user_email: (task.created_user as any)?.email,
            timestamp: task.updated_at,
            project_id: task.project_id,
            project_name: (task.project as any)?.name,
            company_name: (task.project as any)?.company?.name,
            task_id: task.id,
            task_title: task.title
          })
        }
      })
    }

    // Fetch recent task comments
    const { data: recentComments } = await supabase
      .from('task_comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        task_id,
        user:users!task_comments_user_id_fkey(id, full_name, email),
        task:tasks!task_comments_task_id_fkey(id, title, project_id, project:projects!tasks_project_id_fkey(id, name, company_id, company:companies!projects_company_id_fkey(id, name)))
      `)
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (recentComments) {
      recentComments.forEach(comment => {
        activities.push({
          id: `comment-${comment.id}`,
          type: 'comment_added',
          user_id: comment.user_id,
          user_name: (comment.user as any)?.full_name || 'Unknown',
          user_email: (comment.user as any)?.email,
          timestamp: comment.created_at,
          project_id: (comment.task as any)?.project_id,
          project_name: (comment.task as any)?.project?.name,
          company_name: (comment.task as any)?.project?.company?.name,
          task_id: comment.task_id,
          task_title: (comment.task as any)?.title,
          comment_content: comment.content
        })
      })
    }

    // Sort all activities by timestamp and return the most recent
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    return []
  }
}

