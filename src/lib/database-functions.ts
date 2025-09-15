import { supabase } from './supabase'
import type { Project, Task, TaskWithDetails, ProjectWithDetails, User, Company, Form, FormField, FormSubmission, Service, ServiceWithCompanyStatus, InternalUserCompany, UserWithCompanies, UserInvitation } from './supabase'
import { getCurrentUser } from './auth'

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
      console.warn('set_user_context RPC function not available, falling back to basic auth')
    }
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

    // Log activity
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
    return null
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return null
    }

    // Log activity
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
    console.error('Supabase not configured - missing environment variables')
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

    console.log('Inserting project data:', insertData)
    console.log('Supabase client:', supabase)

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

    console.log('Data validation passed')

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single()

    console.log('Supabase response - data:', data)
    console.log('Supabase response - error:', error)
    console.log('Supabase response - error JSON:', JSON.stringify(error, null, 2))

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      console.error('Full error object:', JSON.stringify(error, null, 2))
      return { success: false, error: error.message || 'Failed to create project' }
    }

    if (!data) {
      console.error('No data returned from Supabase')
      return { success: false, error: 'No data returned from database' }
    }

    console.log('Project created successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error creating project:', error)
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available')
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function updateProject(projectId: string, projectData: Partial<Project>): Promise<{ success: boolean; data?: Project; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
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

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' }
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
    console.warn('Supabase not configured')
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
        console.error('Access denied: User is not admin')
        return { success: false, error: 'Access denied: Only admin users can manage project users' }
      }
    }
    
    const { error } = await supabase
      .from('project_managers')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing project manager:', error)
      return { success: false, error: error.message || 'Failed to remove project manager' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing project manager:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function addProjectMember(projectId: string, userId: string, role: string = 'member', currentUserId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Adding project member:', { projectId, userId, role, currentUserId })
    
    // Check if current user is admin (application-level security)
    if (currentUserId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUserId)
        .single()
      
      if (userError || !userData || userData.role !== 'admin') {
        console.error('Access denied: User is not admin')
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
      console.error('Error adding project member:', error)
      return { success: false, error: error.message || 'Failed to add project member' }
    }

    console.log('Project member added successfully')
    return { success: true }
  } catch (error) {
    console.error('Error adding project member:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function removeProjectMember(projectId: string, userId: string, currentUserId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
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
        console.error('Access denied: User is not admin')
        return { success: false, error: 'Access denied: Only admin users can manage project users' }
        }
    }
    
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing project member:', error)
      return { success: false, error: error.message || 'Failed to remove project member' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing project member:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function updateTask(taskId: string, taskData: Partial<Task>): Promise<{ success: boolean; data?: Task; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Updating task:', { taskId, taskData })
    
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...taskData,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single()

    if (error) {
      console.error('Error updating task:', error)
      return { success: false, error: error.message || 'Failed to update task' }
    }

    console.log('Task updated successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error updating task:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Deleting task:', taskId)
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting task:', error)
      return { success: false, error: error.message || 'Failed to delete task' }
    }

    console.log('Task deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('Error deleting task:', error)
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
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Fetching task assignments for task:', taskId)
    
    const { data, error } = await supabase
      .rpc('get_task_assignments', { task_id_param: taskId })

    if (error) {
      console.error('Error fetching task assignments:', error)
      return { success: false, error: error.message || 'Failed to fetch task assignments' }
    }

    console.log('Task assignments fetched successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching task assignments:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function assignUsersToTask(taskId: string, userIds: string[], assignedBy?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Assigning users to task:', { taskId, userIds, assignedBy })
    
    // Get current user ID from localStorage if not provided
    let currentUserId = assignedBy
    if (!currentUserId) {
      const currentUser = localStorage.getItem('auth-user')
      if (currentUser) {
        const user = JSON.parse(currentUser)
        currentUserId = user.id
      }
    }
    
    const { error } = await supabase
      .rpc('assign_users_to_task', { 
        task_id_param: taskId, 
        user_ids: userIds,
        assigned_by_param: currentUserId || null
      })

    if (error) {
      console.error('Error assigning users to task:', error)
      return { success: false, error: error.message || 'Failed to assign users to task' }
    }

    console.log('Users assigned to task successfully')
    return { success: true }
  } catch (error) {
    console.error('Error assigning users to task:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function removeUsersFromTask(taskId: string, userIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Removing users from task:', { taskId, userIds })
    
    const { error } = await supabase
      .rpc('remove_users_from_task', { 
        task_id_param: taskId, 
        user_ids: userIds
      })

    if (error) {
      console.error('Error removing users from task:', error)
      return { success: false, error: error.message || 'Failed to remove users from task' }
    }

    console.log('Users removed from task successfully')
    return { success: true }
  } catch (error) {
    console.error('Error removing users from task:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

// Notification functions








export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Marking all notifications as read')
    
    const { error } = await supabase
      .rpc('mark_all_notifications_read')

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return { success: false, error: error.message || 'Failed to mark all notifications as read' }
    }

    console.log('All notifications marked as read successfully')
    return { success: true }
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function createTestNotification(userId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Creating test notification')
    console.log('User ID parameter:', userId)
    
    // Get the current user ID - either from parameter or from localStorage
    let currentUserId = userId
    if (!currentUserId) {
      console.log('No user ID provided, checking localStorage...')
      const currentUser = localStorage.getItem('auth-user')
      console.log('localStorage auth-user:', currentUser)
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' }
      }
      const user = JSON.parse(currentUser)
      currentUserId = user.id
    }
    
    console.log('Creating test notification for user:', currentUserId)

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
      console.log('Direct insert failed, trying RPC function:', insertError)
      
      // Fallback to RPC function
      const { error: rpcError } = await supabase
        .rpc('create_notification', {
          target_user_id: currentUserId,
          notification_title: 'Test Notification',
          notification_message: 'This is a test notification to verify the system is working.',
          notification_type: 'system'
        })

      if (rpcError) {
        console.error('Error creating test notification:', rpcError)
        return { success: false, error: rpcError.message || 'Failed to create test notification' }
      }
    }

    console.log('Test notification created successfully')
    return { success: true }
  } catch (error) {
    console.error('Error creating test notification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

// Test function to simulate task assignment and trigger notification
export async function testTaskAssignmentNotification(targetUserId: string, taskId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Testing task assignment notification for user:', targetUserId, 'task:', taskId)
    
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
      console.error('Error creating test notification:', error)
      return { success: false, error: error.message || 'Failed to create test notification' }
    }

    console.log('Test notification created successfully')
    return { success: true }
  } catch (error) {
    console.error('Error testing task assignment notification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

// Function to test actual task assignment (when RLS is fixed)
export async function testActualTaskAssignment(targetUserId: string, taskId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Testing actual task assignment for user:', targetUserId, 'task:', taskId)
    
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
      console.error('Error creating actual task assignment:', error)
      return { success: false, error: error.message || 'Failed to create actual task assignment' }
    }

    console.log('Actual task assignment created successfully')
    return { success: true }
  } catch (error) {
    console.error('Error testing actual task assignment:', error)
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
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Creating user:', userData)
    console.log('Tab permissions to save:', userData.tab_permissions)
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
      console.error('Error creating user:', error)
      return { success: false, error: error.message || 'Failed to create user' }
    }

    // If this is an internal user and company_ids are provided, create company assignments
    if (data.role === 'internal' && userData.company_ids && userData.company_ids.length > 0) {
      console.log('Processing internal user company assignments for new user:', data.id)
      console.log('Company IDs to assign:', userData.company_ids)
      
      // Check if the table exists first
      const { error: tableCheckError } = await supabase
        .from('internal_user_companies')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        console.error('Table check failed:', tableCheckError)
        console.error('This suggests the internal_user_companies table does not exist')
        console.error('User creation will continue, but company assignments will fail')
        return { success: false, error: 'Internal user companies table not found. Please run the database migration first.' }
      }
      
      console.log('Table exists, proceeding with company assignments')
      
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
        console.error('Error creating company assignments:', assignmentError)
        console.error('Assignment error details:', {
          message: assignmentError.message,
          details: assignmentError.details,
          hint: assignmentError.hint,
          code: assignmentError.code
        })
        console.error('Full error object:', JSON.stringify(assignmentError, null, 2))
        console.error('Error type:', typeof assignmentError)
        console.error('Error keys:', Object.keys(assignmentError || {}))
        // Don't fail the user creation, just log the error
      }
    }

    console.log('User created successfully:', data)
    console.log('Created user tab permissions:', data.tab_permissions)
    return { success: true, data }
  } catch (error) {
    console.error('Error creating user:', error)
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
}): Promise<{ success: boolean; data?: User; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Updating user:', userId, userData)
    console.log('Tab permissions to save:', userData.tab_permissions)
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
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return { success: false, error: error.message || 'Failed to update user' }
    }

    // If this is an internal user and company_ids are provided, update company assignments
    if (data.role === 'internal' && userData.company_ids) {
      console.log('Processing internal user company assignments for user:', userId)
      console.log('Company IDs to assign:', userData.company_ids)
      
      // Check if the table exists first
      const { error: tableCheckError } = await supabase
        .from('internal_user_companies')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        console.error('Table check failed:', tableCheckError)
        console.error('This suggests the internal_user_companies table does not exist')
        return { success: false, error: 'Internal user companies table not found. Please run the database migration first.' }
      }
      
      console.log('Table exists, proceeding with company assignments')
      
      // First, remove existing assignments
      const { error: deleteError } = await supabase
        .from('internal_user_companies')
        .delete()
        .eq('user_id', userId)

      if (deleteError) {
        console.error('Error deleting existing company assignments:', deleteError)
      }

      // Then, create new assignments
      if (userData.company_ids.length > 0) {
        const companyAssignments = userData.company_ids.map((companyId, index) => ({
          user_id: userId,
          company_id: companyId,
          is_primary: companyId === userData.primary_company_id || (index === 0 && !userData.primary_company_id),
          assigned_by: userData.assigned_manager_id || null
        }))

        console.log('Attempting to insert company assignments:', companyAssignments)
        console.log('Target table: internal_user_companies')
        
        const { error: assignmentError } = await supabase
          .from('internal_user_companies')
          .insert(companyAssignments)

        if (assignmentError) {
          console.error('Error creating company assignments:', assignmentError)
          console.error('Assignment error details:', {
            message: assignmentError.message,
            details: assignmentError.details,
            hint: assignmentError.hint,
            code: assignmentError.code
          })
          console.error('Full error object:', JSON.stringify(assignmentError, null, 2))
          console.error('Error type:', typeof assignmentError)
          console.error('Error keys:', Object.keys(assignmentError || {}))
          // Don't fail the user update, just log the error
        }
      }
    }

    console.log('User updated successfully:', data)
    console.log('Updated user tab permissions:', data.tab_permissions)
    return { success: true, data }
  } catch (error) {
    console.error('Error updating user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Deleting user:', userId)
    await setAppContext()
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Error deleting user:', error)
      return { success: false, error: error.message || 'Failed to delete user' }
    }

    console.log('User deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function fetchUsers(): Promise<User[]> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return []
  }

  try {
    console.log('Fetching users from Supabase...')
    
    // Try to fetch with tab_permissions first
    const resultWithPermissions = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at, updated_at, is_active, assigned_manager_id, company_id, tab_permissions')
      .eq('is_active', true)
      .order('full_name', { ascending: true })
    
    if (resultWithPermissions.error) {
      console.log('Error fetching with tab_permissions, trying without:', resultWithPermissions.error)
      // Fallback to fetch without tab_permissions if column doesn't exist
      const resultWithoutPermissions = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at, updated_at, is_active, assigned_manager_id, company_id')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
      
      if (resultWithoutPermissions.error) {
        console.error('Error fetching users:', resultWithoutPermissions.error)
        return []
      }

      // Transform data to include tab_permissions as empty array
      const users = (resultWithoutPermissions.data || []).map(user => ({
        ...user,
        tab_permissions: []
      }))
      
      console.log('Successfully fetched users without tab_permissions')
      return users
    }

    // Transform data to ensure tab_permissions is always an array
    const users = (resultWithPermissions.data || []).map(user => ({
      ...user,
      tab_permissions: user.tab_permissions || []
    }))
    
    console.log('Successfully fetched users with tab_permissions')
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
export async function fetchCompanies(): Promise<Company[]> {
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

    return data || []
  } catch (error) {
    return []
  }
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

    // Transform the data to flatten the services structure
    const transformedData = (data || []).map(company => {
      const services = company.company_services
        ?.map((cs: { service_id: string; service: Service }) => cs.service)
        .filter(Boolean) || []
      
      console.log(`Company ${company.name} has ${services.length} services:`, services.map((s: Service) => s.name))
      
      return {
        ...company,
        services
      }
    })

    return transformedData
  } catch (error) {
    console.error('Error in fetchCompaniesWithServices:', error)
    return []
  }
}

export async function createCompany(companyData: {
  name: string
  description?: string
  industry?: string
  website?: string
  phone?: string
  address?: string
  is_partner?: boolean
}): Promise<{ success: boolean; data?: Company; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Creating company:', companyData)
    await setAppContext()
    
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: companyData.name,
        description: companyData.description,
        industry: companyData.industry,
        website: companyData.website,
        phone: companyData.phone,
        address: companyData.address,
        is_partner: companyData.is_partner || false,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating company:', error)
      return { success: false, error: error.message || 'Failed to create company' }
    }

    console.log('Company created successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error creating company:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

export async function updateCompany(companyId: string, companyData: {
  name: string
  description?: string
  industry?: string
  website?: string
  phone?: string
  address?: string
  is_active: boolean
  is_partner: boolean
}): Promise<{ success: boolean; data?: Company; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Updating company:', companyId, companyData)
    await setAppContext()
    
    const { data, error } = await supabase
      .from('companies')
      .update({
        name: companyData.name,
        description: companyData.description,
        industry: companyData.industry,
        website: companyData.website,
        phone: companyData.phone,
        address: companyData.address,
        is_partner: companyData.is_partner,
        is_active: companyData.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)
      .select()
      .single()

    if (error) {
      console.error('Error updating company:', error)
      return { success: false, error: error.message || 'Failed to update company' }
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
    
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId)

    if (error) {
      console.error('Error deleting company:', error)
      return { success: false, error: error.message || 'Failed to delete company' }
    }

    console.log('Company deleted successfully')
    return { success: true }
  } catch (error) {
    console.error('Error deleting company:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
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

export async function submitForm(formId: string, submissionData: Record<string, unknown>, userId: string): Promise<{ success: boolean; data?: FormSubmission; error?: string }> {
  if (!supabase) {
    console.warn('Supabase not configured')
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    console.log('Submitting form:', formId, submissionData)
    
    const { data, error } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        user_id: userId,
        submission_data: submissionData
      })
      .select()
      .single()

    if (error) {
      console.error('Error submitting form:', error)
      return { success: false, error: error.message || 'Failed to submit form' }
    }

    console.log('Form submitted successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error submitting form:', error)
    return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }
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
        user:users!form_submissions_user_id_fkey(id, full_name, email)
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
    console.log('Updating company services:', { companyId, serviceIds })
    
    // Get current user for debugging
    const currentUser = getCurrentUser()
    console.log('Current user context:', currentUser)
    
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

    // First, get all current services for this company
    const { data: currentServices, error: fetchError } = await supabase
      .from('company_services')
      .select('service_id')
      .eq('company_id', companyId)

    if (fetchError) {
      console.error('Error fetching current company services:', fetchError)
      return { success: false, error: `Failed to fetch current services: ${fetchError.message}` }
    }

    const currentServiceIds = new Set(currentServices?.map(cs => cs.service_id) || [])
    const newServiceIds = new Set(serviceIds)

    // Services to add (in newServiceIds but not in currentServiceIds)
    const servicesToAdd = serviceIds.filter(id => !currentServiceIds.has(id))

    // Services to remove (in currentServiceIds but not in newServiceIds)
    const servicesToRemove = Array.from(currentServiceIds).filter(id => !newServiceIds.has(id))

    console.log('Services to add:', servicesToAdd)
    console.log('Services to remove:', servicesToRemove)

    // Add new services
    if (servicesToAdd.length > 0) {
      const servicesToInsert = servicesToAdd.map(serviceId => ({
        company_id: companyId,
        service_id: serviceId,
        is_active: true
      }))

      console.log('Inserting services:', servicesToInsert)

      const { error: insertError } = await supabase
        .from('company_services')
        .insert(servicesToInsert)

      if (insertError) {
        console.error('Error adding company services:', insertError)
        return { success: false, error: `Failed to add services: ${insertError.message}` }
      }
    }

    // Remove services (deactivate them)
    if (servicesToRemove.length > 0) {
      console.log('Deactivating services:', servicesToRemove)

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

    console.log('Company services updated successfully')
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
    console.log('Fetching company services from Supabase...', { companyId })
    await setAppContext()
    const { data, error } = await supabase
      .from('company_services')
      .select(`
        service_id,
        services (*)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)

    console.log('Supabase company services response:', { data, error })

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
}

// Create a new document record
export async function createDocumentRecord(
  name: string,
  filePath: string,
  fileSize: number,
  fileType: string,
  companyId: string,
  folderPath: string = '/',
  userId: string
): Promise<{ success: boolean; document?: Document; error?: string }> {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
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

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, document: data }
  } catch (error) {
    return { success: false, error: 'Failed to create document record' }
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
  parentFolderId?: string
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
    if (parentFolderId) {
      // Get parent folder path and check if it's a system folder
      const { data: parentFolder, error: parentError } = await supabase
        .from('document_folders')
        .select('path, is_system_folder, is_readonly')
        .eq('id', parentFolderId)
        .single()
      
      if (parentError) {
        return { success: false, error: `Parent folder error: ${parentError.message}` }
      }
      
      if (parentFolder) {
        // Check if parent is a readonly system folder
        if (parentFolder.is_system_folder && parentFolder.is_readonly) {
          return { success: false, error: 'Cannot create folders inside readonly system folders' }
        }
        
        path = `${parentFolder.path}/${name}`
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

    const { data, error } = await supabase
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

    if (error) {
      console.error('Error creating folder in database:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return { success: false, error: `Database error: ${error.message || 'Unknown error'}` }
    }

    console.log('Folder created successfully:', data)
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

    // First get the document to get the file path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
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

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message }
    }

    return { success: true, isFavorited: !!data }
  } catch (error) {
    return { success: false, error: 'Failed to check favorite status' }
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
      console.error('Error creating user invitation:', error)
      return { success: false, error: error.message || 'Failed to create invitation' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error creating user invitation:', error)
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
