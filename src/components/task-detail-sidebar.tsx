'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  MessageSquare, 
  Edit, 
  Trash2,
  Send,
  AlertCircle,
  CheckCircle,
  Circle
} from 'lucide-react'
import { format } from 'date-fns'
import { TaskWithDetails, TaskComment, User as UserType } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

interface TaskCommentWithUser extends TaskComment {
  user?: UserType
}

interface TaskDetailSidebarProps {
  task: TaskWithDetails | null
  isOpen: boolean
  onClose: () => void
  onEditTask: (task: TaskWithDetails) => void
  onDeleteTask: (taskId: string) => void
  projectTitle?: string
}

export default function TaskDetailSidebar({ 
  task, 
  isOpen, 
  onClose, 
  onEditTask, 
  onDeleteTask,
  projectTitle
}: TaskDetailSidebarProps) {
  const { data: session } = useSession()
  const [comments, setComments] = useState<TaskCommentWithUser[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)

  // Load comments when task changes
  useEffect(() => {
    if (task?.id) {
      loadComments()
    }
  }, [task?.id])

  const loadComments = async () => {
    if (!task?.id || !supabase) return

    setIsLoadingComments(true)
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:users!task_comments_user_id_fkey(id, full_name, email)
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading comments:', error)
        return
      }

      setComments(data || [])
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !task?.id || !session?.user?.id || !supabase) return

    setIsSubmittingComment(true)
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: task.id,
          user_id: session.user.id,
          content: newComment.trim()
        })
        .select(`
          *,
          user:users!task_comments_user_id_fkey(id, full_name, email)
        `)
        .single()

      if (error) {
        console.error('Error submitting comment:', error)
        return
      }

      setComments(prev => [...prev, data])
      setNewComment('')

      // Create notification for task assignee and other commenters (if different from commenter)
      if (data) {
        const { createTaskCommentNotification } = await import('@/lib/notification-functions')
        
        // Extract mentions from comment (@username format)
        const mentionMatches = newComment.match(/@(\w+)/g) || []
        // For now, we'll just notify the task assignee
        // TODO: Parse actual user IDs from mentions
        
        await createTaskCommentNotification(
          task.id,
          task.title,
          data.id,
          session.user.id,
          session.user.name || 'Unknown',
          [] // Mentioned user IDs - to be implemented
        ).catch(err => console.error('Failed to create comment notification:', err))
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-blue-600" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal':
      case 'medium': // Handle both 'normal' and 'medium' (backwards compatibility)
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const isOverdue = task?.due_date && new Date(task.due_date) < new Date()

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {task.title}
            </h2>
            <div className="flex items-center gap-2 mb-3">
              {getStatusIcon(task.status)}
              <Badge className={getPriorityColor(task.priority)}>
                {(task.priority as string) === 'medium' ? 'normal' : task.priority}
              </Badge>
              <Badge variant="outline">
                {task.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditTask(task)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteTask(task.id)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Task Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">Details</h3>
            
            {task.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                  {isOverdue && (
                    <span className="text-red-600 ml-1">(Overdue)</span>
                  )}
                </span>
              </div>
            )}

            {(task.estimated_hours > 0 || task.actual_hours > 0) && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Time: {task.actual_hours}h / {task.estimated_hours}h
                </span>
              </div>
            )}

            {task.assigned_user && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {task.assigned_user.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">
                    {task.assigned_user.full_name}
                  </span>
                </div>
              </div>
            )}

            {projectTitle && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-blue-100 flex items-center justify-center">
                  <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                </div>
                <span className="text-sm text-gray-600">
                  Project: {projectTitle}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900">
                Comments ({comments.length})
              </h3>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {isLoadingComments ? (
                <div className="text-sm text-gray-500">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-gray-500">No comments yet</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {comment.user?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.user?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
