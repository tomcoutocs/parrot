'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, X, AlertCircle, FileText, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { 
  getUserNotifications, 
  getUnreadNotificationCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  createTestNotification,
  testTaskAssignmentNotification,
  type Notification 
} from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'

export function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Load notifications and unread count
  useEffect(() => {
    if (session?.user?.id) {
      loadNotifications()
      loadUnreadCount()
    }
  }, [session?.user?.id])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const result = await getUserNotifications(20, false)
      if (result.success && result.data) {
        setNotifications(result.data)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const result = await getUnreadNotificationCount()
      if (result.success && result.count !== undefined) {
        setUnreadCount(result.count)
      }
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const result = await markNotificationAsRead(notificationId)
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        )
        // Reload unread count
        loadUnreadCount()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const result = await markAllNotificationsAsRead()
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const handleCreateTestNotification = async () => {
    try {
      console.log('Session data:', session)
      console.log('User ID from session:', session?.user?.id)
      
      if (!session?.user?.id) {
        console.error('No user ID found in session')
        return
      }
      
      const result = await createTestNotification(session.user.id)
      if (result.success) {
        // Reload notifications
        await loadNotifications()
        await loadUnreadCount()
      } else {
        console.error('Failed to create test notification:', result.error)
      }
    } catch (error) {
      console.error('Error creating test notification:', error)
    }
  }

  const handleTestTaskAssignment = async () => {
    try {
      console.log('Testing task assignment notification')
      
      if (!session?.user?.id) {
        console.error('No user ID found in session')
        return
      }
      
      // Use a sample task ID from the database
      const sampleTaskId = '550e8400-e29b-41d4-a716-446655440201'
      
      const result = await testTaskAssignmentNotification(session.user.id, sampleTaskId)
      if (result.success) {
        // Reload notifications
        await loadNotifications()
        await loadUnreadCount()
        console.log('Task assignment notification test completed')
      } else {
        console.error('Failed to test task assignment notification:', result.error)
      }
    } catch (error) {
      console.error('Error testing task assignment notification:', error)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task_assignment':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'project_assignment':
        return <Users className="h-4 w-4 text-green-600" />
      case 'task_update':
        return <FileText className="h-4 w-4 text-orange-600" />
      case 'project_update':
        return <Users className="h-4 w-4 text-purple-600" />
      case 'system':
        return <Settings className="h-4 w-4 text-gray-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const formatNotificationTime = (createdAt: string) => {
    const date = new Date(createdAt)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return format(date, 'MMM d')
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCreateTestNotification}
              className="h-6 px-2 text-xs"
            >
              Test
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleTestTaskAssignment}
              className="h-6 px-2 text-xs"
            >
              Test Task
            </Button>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMarkAllAsRead}
                className="h-6 px-2 text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Bell className="h-8 w-8 mb-2" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="flex-shrink-0 ml-2">
                          <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatNotificationTime(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkAsRead(notification.id)
                      }}
                      className="h-6 w-6 p-0 flex-shrink-0"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center text-sm text-blue-600 hover:text-blue-700"
              onClick={() => {
                setIsOpen(false)
                // You could navigate to a full notifications page here
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 