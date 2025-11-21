'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  fetchUserNotifications, 
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationWithUser,
  NotificationType
} from '@/lib/notification-functions'
import { useSession } from '@/components/providers/session-provider'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationWithUser[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all')
  const [isOpen, setIsOpen] = useState(false)

  const userId = session?.user?.id

  const handleViewTask = async (taskId: string) => {
    if (!taskId || !supabase) return

    try {
      // Fetch task to get project_id
      const { data: task, error } = await supabase
        .from('tasks')
        .select('id, project_id, title')
        .eq('id', taskId)
        .single()

      if (error || !task) {
        console.error('Error fetching task:', error)
        return
      }

      // Mark notification as read
      await markNotificationAsRead(
        notifications.find(n => n.related_task_id === taskId)?.id || ''
      )

      // Navigate to projects tab
      router.push(`/dashboard?tab=projects&taskId=${taskId}&projectId=${task.project_id}`)

      // Dispatch event to open task sidebar (ProjectsTab will listen to this)
      window.dispatchEvent(new CustomEvent('open-task', {
        detail: { taskId, projectId: task.project_id }
      }))

      // Close notification dropdown
      setIsOpen(false)
    } catch (error) {
      console.error('Error navigating to task:', error)
    }
  }

  // Load notifications and unread count
  const loadNotifications = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      const [notificationsResult, count] = await Promise.allSettled([
        fetchUserNotifications(userId, {
          limit: 50,
          type: filterType === 'all' ? undefined : filterType
        }),
        getUnreadNotificationCount(userId)
      ])

      // Handle notifications result
      if (notificationsResult.status === 'fulfilled') {
        const result = notificationsResult.value
        if (result.success && result.data) {
          setNotifications(result.data)
        } else if (result.error) {
          console.error('Error fetching notifications:', result.error)
        }
      } else {
        console.error('Error fetching notifications:', notificationsResult.reason)
      }

      // Handle count result
      if (count.status === 'fulfilled') {
        setUnreadCount(count.value)
      } else {
        console.error('Error getting unread count:', count.reason)
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, filterType])

  useEffect(() => {
    if (userId) {
      loadNotifications()
    }
  }, [userId, loadNotifications])

  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!userId || !supabase) return

    // Set up real-time subscription for notifications
    
    let channel: ReturnType<typeof supabase.channel> | null = null
    let retryTimeout: NodeJS.Timeout | null = null
    let retryCount = 0
    const maxRetries = 3

    const setupSubscription = () => {
      if (!userId || !supabase) return

      try {
        channel = supabase
          .channel(`user-notifications-${userId}`, {
            config: {
              broadcast: { self: false },
              presence: { key: userId }
            }
          })
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`
            },
            (payload) => {
              // Reload notifications when new ones arrive
              if (userId) {
                loadNotifications()
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              retryCount = 0 // Reset retry count on success
            } else if (status === 'CHANNEL_ERROR') {
              // Only log error details if err is provided
              // Sometimes Supabase doesn't pass the error object, which is fine
              if (err) {
                console.warn('Error subscribing to notifications channel:', err)
              }
              // Don't log as error unless we've exhausted retries
              if (retryCount < maxRetries) {
                retryCount++
                // Wait 2 seconds before retrying
                retryTimeout = setTimeout(() => {
                  if (channel && supabase) {
                    supabase.removeChannel(channel)
                  }
                  setupSubscription()
                }, 2000)
              } else {
                // Only log warning after all retries exhausted
                console.warn('Real-time notifications unavailable after retries. Notifications will still work, but updates may be delayed.')
              }
            } else if (status === 'TIMED_OUT') {
              if (retryCount < maxRetries && !retryTimeout) {
                retryCount++
                retryTimeout = setTimeout(() => {
                  if (channel && supabase) {
                    supabase.removeChannel(channel)
                  }
                  setupSubscription()
                }, 2000)
              }
            }
          })
      } catch (error) {
        console.error('Error setting up notification subscription:', error)
        // Don't break the app - notifications still work without real-time updates
      }
    }

    setupSubscription()

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId, loadNotifications])

  const handleMarkAsRead = async (notificationId: string) => {
    const result = await markNotificationAsRead(notificationId)
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!userId) return
    const result = await markAllNotificationsAsRead(userId)
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    }
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return '📋'
      case 'task_updated':
        return '✏️'
      case 'task_commented':
        return '💬'
      case 'comment_mention':
        return '🔔'
      case 'project_assigned':
        return '📁'
      case 'project_updated':
        return '📝'
      case 'space_update':
        return '📢'
      case 'system':
        return '⚙️'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return 'text-blue-500'
      case 'task_updated':
        return 'text-green-500'
      case 'task_commented':
      case 'comment_mention':
        return 'text-purple-500'
      case 'project_assigned':
      case 'project_updated':
        return 'text-orange-500'
      case 'space_update':
      case 'system':
        return 'text-indigo-500'
      default:
        return 'text-gray-500'
    }
  }

  if (!userId) return null

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs h-7"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
              className="text-xs h-7 flex-1"
            >
              All
            </Button>
            <Button
              variant={filterType === 'task_assigned' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('task_assigned')}
              className="text-xs h-7 flex-1"
            >
              Tasks
            </Button>
            <Button
              variant={filterType === 'task_commented' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('task_commented')}
              className="text-xs h-7 flex-1"
            >
              Comments
            </Button>
            <Button
              variant={filterType === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('system')}
              className="text-xs h-7 flex-1"
            >
              System
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No notifications</p>
              <p className="text-xs text-gray-400 mt-1">
                {filterType === 'all' 
                  ? "You're all caught up!" 
                  : `No ${filterType.replace('_', ' ')} notifications`}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer relative group",
                    !notification.read && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification.id)
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "text-2xl flex-shrink-0",
                      getNotificationColor(notification.type)
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium",
                            !notification.read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          {notification.created_by && (
                            <p className="text-xs text-gray-500 mt-1">
                              by {notification.created_by.full_name}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {notification.related_task_id && (
                        <div className="mt-2">
                          <Button
                            variant="link"
                            size="sm"
                            className="text-xs h-auto p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (notification.related_task_id) {
                                handleViewTask(notification.related_task_id)
                              }
                            }}
                          >
                            View Task →
                          </Button>
                        </div>
                      )}
                    </div>
                    {!notification.read && (
                      <div className="absolute top-4 right-4 h-2 w-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

