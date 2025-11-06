'use client'

import { supabase } from './supabase'
import { User } from './supabase'

export type NotificationType = 
  | 'task_assigned' 
  | 'task_updated' 
  | 'task_commented' 
  | 'project_assigned'
  | 'project_updated'
  | 'comment_mention'
  | 'system'
  | 'space_update'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  related_task_id?: string
  related_project_id?: string
  related_comment_id?: string
  created_by_user_id?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface NotificationWithUser extends Notification {
  created_by?: User
}

/**
 * Fetch notifications for the current user
 */
export async function fetchUserNotifications(
  userId: string,
  options?: {
    unreadOnly?: boolean
    limit?: number
    type?: NotificationType
  }
): Promise<{ success: boolean; data?: NotificationWithUser[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  if (!userId) {
    console.warn('fetchUserNotifications called without userId')
    return { success: false, error: 'User ID is required' }
  }

  try {
    // Start with basic query (foreign key joins can cause issues with RLS/custom auth)
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (options?.unreadOnly) {
      query = query.eq('"read"', false)
    }

    if (options?.type) {
      query = query.eq('type', options.type)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notifications:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error
      })
      return { success: false, error: error.message || 'Failed to fetch notifications' }
    }

    // If we have created_by_user_id, fetch user details separately (optional - gracefully handle RLS errors)
    if (data && data.length > 0) {
      const userIdsWithCreatedBy = [...new Set(
        data
          .map(n => n.created_by_user_id)
          .filter((id): id is string => Boolean(id))
      )]

      if (userIdsWithCreatedBy.length > 0) {
        try {
          // Try to fetch user details, but don't fail if RLS blocks it
          // Handle single user case (array with one element) differently if needed
          const userIdsArray = Array.isArray(userIdsWithCreatedBy) ? userIdsWithCreatedBy : [userIdsWithCreatedBy]
          
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, full_name, email')
            .in('id', userIdsArray.length > 0 ? userIdsArray : [])

          if (usersError) {
            console.warn('Could not fetch user details for notifications (RLS or permissions issue):', {
              message: usersError.message,
              details: usersError.details,
              hint: usersError.hint,
              code: usersError.code
            })
            // Return notifications without user data if fetch fails
            return { success: true, data: data as NotificationWithUser[] }
          }

          // Map user data to notifications
          const notificationsWithUsers = data.map(notification => ({
            ...notification,
            created_by: users?.find(u => u.id === notification.created_by_user_id)
          })) as NotificationWithUser[]

          return { success: true, data: notificationsWithUsers }
        } catch (userFetchError) {
          console.warn('Error fetching user details for notifications, returning without user data:', userFetchError)
          // Return notifications without user data if fetch fails
          return { success: true, data: data as NotificationWithUser[] }
        }
      }
    }

    return { success: true, data: data as NotificationWithUser[] }
  } catch (error) {
    console.error('Error fetching notifications:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error : JSON.stringify(error, Object.getOwnPropertyNames(error)),
      stack: error instanceof Error ? error.stack : undefined
    })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch notifications' 
    }
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!supabase) return 0

  if (!userId) {
    console.warn('getUnreadNotificationCount called without userId')
    return 0
  }

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('"read"', false)

    if (error) {
      console.error('Error getting unread count:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error
      })
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error getting unread count:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error : JSON.stringify(error, Object.getOwnPropertyNames(error)),
      stack: error instanceof Error ? error.stack : undefined
    })
    return 0
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ "read": true })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error
      })
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to mark notification as read' 
    }
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ "read": true })
      .eq('user_id', userId)
      .eq('"read"', false)

    if (error) {
      console.error('Error marking all notifications as read:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error
      })
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to mark all notifications as read' 
    }
  }
}

/**
 * Create a notification
 */
export async function createNotification(
  notification: {
    user_id: string
    title: string
    message: string
    type: NotificationType
    related_task_id?: string
    related_project_id?: string
    related_comment_id?: string
    created_by_user_id?: string
    metadata?: Record<string, unknown>
  }
): Promise<{ success: boolean; data?: Notification; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        related_task_id: notification.related_task_id,
        related_project_id: notification.related_project_id,
        related_comment_id: notification.related_comment_id,
        created_by_user_id: notification.created_by_user_id,
        metadata: notification.metadata,
        "read": false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error,
        notificationData: notification
      })
      return { success: false, error: error.message || 'Failed to create notification' }
    }

    console.log('Notification created successfully:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('Error creating notification:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error : JSON.stringify(error, Object.getOwnPropertyNames(error)),
      stack: error instanceof Error ? error.stack : undefined,
      notificationData: notification
    })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create notification' 
    }
  }
}

/**
 * Create notification for task assignment
 */
export async function createTaskAssignmentNotification(
  taskId: string,
  taskTitle: string,
  assignedUserId: string,
  assignedByName: string,
  projectName?: string,
  assignedByUserId?: string
): Promise<{ success: boolean; error?: string }> {
  console.log('createTaskAssignmentNotification called:', {
    taskId,
    taskTitle,
    assignedUserId,
    assignedByName,
    projectName,
    assignedByUserId
  })
  
  return createNotification({
    user_id: assignedUserId,
    title: 'Task Assigned',
    message: `${assignedByName} assigned you to "${taskTitle}"${projectName ? ` in ${projectName}` : ''}`,
    type: 'task_assigned',
    related_task_id: taskId,
    created_by_user_id: assignedByUserId || assignedUserId, // Use the assigner's ID, not the assignee's
    metadata: { taskTitle, projectName }
  }).then(result => {
    console.log('createTaskAssignmentNotification result:', result)
    return { success: result.success, error: result.error }
  })
}

/**
 * Create notification for task comment
 */
export async function createTaskCommentNotification(
  taskId: string,
  taskTitle: string,
  commentId: string,
  commentedById: string,
  commentedByName: string,
  mentionedUserIds: string[] = []
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get task assignees and previous commenters
    const { data: task } = await supabase
      .from('tasks')
      .select('id, assigned_user_id, project_id')
      .eq('id', taskId)
      .single()

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    // Get all assigned users from task_assignments table
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('user_id')
      .eq('task_id', taskId)

    // Get all users who have commented on this task (to notify them)
    const { data: commenters } = await supabase
      .from('task_comments')
      .select('user_id')
      .eq('task_id', taskId)
      .neq('user_id', commentedById)

    const uniqueUserIds = new Set<string>()

    // Add task assignees from task_assignments
    assignments?.forEach(a => {
      if (a.user_id !== commentedById) {
        uniqueUserIds.add(a.user_id)
      }
    })

    // Add legacy assigned_user_id if it exists
    if (task.assigned_user_id && task.assigned_user_id !== commentedById) {
      uniqueUserIds.add(task.assigned_user_id)
    }

    // Add previous commenters
    commenters?.forEach(c => {
      if (c.user_id !== commentedById) {
        uniqueUserIds.add(c.user_id)
      }
    })

    // Add mentioned users
    mentionedUserIds.forEach(id => {
      if (id !== commentedById) {
        uniqueUserIds.add(id)
      }
    })

    // Create notifications for all relevant users
    const notifications = Array.from(uniqueUserIds).map(userId =>
      createNotification({
        user_id: userId,
        title: 'New Comment',
        message: `${commentedByName} commented on "${taskTitle}"`,
        type: 'task_commented',
        related_task_id: taskId,
        related_comment_id: commentId,
        created_by_user_id: commentedById
      })
    )

    // Create mention notifications separately
    const mentionNotifications = mentionedUserIds
      .filter(id => id !== commentedById)
      .map(userId =>
        createNotification({
          user_id: userId,
          title: 'Mentioned in Comment',
          message: `${commentedByName} mentioned you in a comment on "${taskTitle}"`,
          type: 'comment_mention',
          related_task_id: taskId,
          related_comment_id: commentId,
          created_by_user_id: commentedById
        })
      )

    const allNotifications = [...notifications, ...mentionNotifications]
    const results = await Promise.all(allNotifications)
    const hasErrors = results.some(r => !r.success)
    
    return { 
      success: !hasErrors, 
      error: hasErrors ? 'Some notifications failed to create' : undefined 
    }
  } catch (error) {
    console.error('Error creating comment notifications:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create notifications' 
    }
  }
}

/**
 * Create notification for task updates (status change, priority change, etc.)
 */
export async function createTaskUpdateNotification(
  taskId: string,
  taskTitle: string,
  updatedById: string,
  updatedByName: string,
  updateType: 'status' | 'priority' | 'due_date' | 'title' | 'description',
  oldValue?: string,
  newValue?: string
): Promise<{ success: boolean; error?: string }> {
  // Get task assignees to notify them
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get all assigned users from task_assignments
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('user_id')
      .eq('task_id', taskId)

    const assigneeIds = assignments?.map(a => a.user_id).filter(id => id !== updatedById) || []

    // Also check legacy assigned_user_id field
    const { data: task } = await supabase
      .from('tasks')
      .select('assigned_user_id')
      .eq('id', taskId)
      .single()

    if (task?.assigned_user_id && 
        task.assigned_user_id !== updatedById && 
        !assigneeIds.includes(task.assigned_user_id)) {
      assigneeIds.push(task.assigned_user_id)
    }

    if (assigneeIds.length === 0) {
      // No assignees to notify
      return { success: true }
    }

    const updateMessages: Record<string, string> = {
      status: `updated the status of "${taskTitle}"`,
      priority: `updated the priority of "${taskTitle}"`,
      due_date: `updated the due date of "${taskTitle}"`,
      title: `renamed "${oldValue}" to "${newValue}"`,
      description: `updated the description of "${taskTitle}"`
    }

    // Create notifications for all assignees
    const notifications = assigneeIds.map(userId =>
      createNotification({
        user_id: userId,
        title: 'Task Updated',
        message: `${updatedByName} ${updateMessages[updateType] || `updated "${taskTitle}"`}`,
        type: 'task_updated',
        related_task_id: taskId,
        created_by_user_id: updatedById,
        metadata: { updateType, oldValue, newValue }
      })
    )

    const results = await Promise.all(notifications)
    const hasErrors = results.some(r => !r.success)
    
    return { 
      success: !hasErrors, 
      error: hasErrors ? 'Some notifications failed to create' : undefined 
    }
  } catch (error) {
    console.error('Error creating task update notification:', error)
    return { success: false, error: 'Failed to create notification' }
  }
}

/**
 * Get all active user IDs in a space (company)
 * This includes:
 * - Users directly assigned to the company (company_id)
 * - Internal users assigned to the company via internal_user_companies
 */
async function getUsersInSpace(companyId: string): Promise<string[]> {
  if (!supabase || !companyId) {
    return []
  }

  try {
    // Get users directly assigned to the company
    const { data: directUsers, error: directError } = await supabase
      .from('users')
      .select('id')
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (directError) {
      console.error('Error fetching direct users:', directError)
    }

    // Get internal users assigned to the company
    const { data: internalUsers, error: internalError } = await supabase
      .from('internal_user_companies')
      .select('user_id')
      .eq('company_id', companyId)

    if (internalError) {
      console.error('Error fetching internal users:', internalError)
    }

    // Get the actual user IDs and check if they're active
    const internalUserIds = (internalUsers || []).map(iu => iu.user_id)
    let activeInternalUserIds: string[] = []

    if (internalUserIds.length > 0) {
      const { data: activeInternalUsers } = await supabase
        .from('users')
        .select('id')
        .in('id', internalUserIds)
        .eq('is_active', true)

      activeInternalUserIds = (activeInternalUsers || []).map(u => u.id)
    }

    // Combine and deduplicate
    const allUserIds = [
      ...(directUsers || []).map(u => u.id),
      ...activeInternalUserIds
    ]

    return [...new Set(allUserIds)]
  } catch (error) {
    console.error('Error getting users in space:', error)
    return []
  }
}

/**
 * Create a space-wide notification for all users in a company's space
 * This sends a notification to all active users who have access to the space
 */
export async function createSpaceWideNotification(
  companyId: string,
  notification: {
    title: string
    message: string
    created_by_user_id: string
    metadata?: Record<string, unknown>
    related_project_id?: string
    related_task_id?: string
  }
): Promise<{ success: boolean; createdCount?: number; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  if (!companyId) {
    return { success: false, error: 'Company ID is required' }
  }

  try {
    // Get all users in the space
    const userIds = await getUsersInSpace(companyId)

    if (userIds.length === 0) {
      console.warn(`No active users found in space/company: ${companyId}`)
      return { success: true, createdCount: 0 }
    }

    console.log(`Creating space-wide notification for ${userIds.length} users in company ${companyId}`)

    // Create notifications for all users
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title: notification.title,
      message: notification.message,
      type: 'space_update' as NotificationType,
      related_task_id: notification.related_task_id,
      related_project_id: notification.related_project_id,
      created_by_user_id: notification.created_by_user_id,
      metadata: {
        ...notification.metadata,
        company_id: companyId,
        is_space_wide: true
      },
      "read": false
    }))

    // Insert all notifications in batches (PostgreSQL has limits on batch size)
    const batchSize = 100
    let createdCount = 0

    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize)
      const { data, error } = await supabase
        .from('notifications')
        .insert(batch)
        .select()

      if (error) {
        console.error(`Error creating notification batch ${i / batchSize + 1}:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error
        })
        // Continue with other batches even if one fails
      } else {
        createdCount += (data || []).length
      }
    }

    console.log(`Successfully created ${createdCount} space-wide notifications`)

    return { 
      success: true, 
      createdCount 
    }
  } catch (error) {
    console.error('Error creating space-wide notification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create space-wide notification' 
    }
  }
}

