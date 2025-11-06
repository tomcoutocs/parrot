'use client'

import { useEffect, useState } from 'react'
import { Kanban, Loader2, ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchTasksOptimized } from '@/lib/simplified-database-functions'
import type { TaskWithDetails } from '@/lib/supabase'
import EmptyState from '@/components/ui/empty-state'

interface TasksSummaryWidgetProps {
  companyId: string
  config?: Record<string, unknown>
  onNavigateToTab?: (tab: string) => void
}

export default function TasksSummaryWidget({ companyId, config, onNavigateToTab }: TasksSummaryWidgetProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const showUpcoming = config?.showUpcoming !== false
  const daysAhead = (config?.daysAhead as number) || 7

  useEffect(() => {
    loadTasks()
  }, [companyId])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const data = await fetchTasksOptimized()
      // Filter by company if we have project data
      let filteredTasks = data

      if (showUpcoming) {
        const now = new Date()
        const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
        filteredTasks = filteredTasks.filter(task => {
          if (!task.due_date) return false
          const dueDate = new Date(task.due_date)
          return dueDate >= now && dueDate <= futureDate && task.status !== 'done'
        })
      } else {
        filteredTasks = filteredTasks.filter(task => task.status !== 'done').slice(0, 10)
      }

      setTasks(filteredTasks.slice(0, 10))
    } catch (err) {
      console.error('Error loading tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <Card className="parrot-card-enhanced h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
        <CardTitle className="flex items-center">
          <Kanban className="h-5 w-5 mr-2" />
          {showUpcoming ? `Upcoming Tasks (${daysAhead} days)` : 'Tasks Summary'}
        </CardTitle>
        {onNavigateToTab && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigateToTab('projects')}
            className="h-8"
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={Kanban}
            title={showUpcoming ? "No upcoming tasks" : "No tasks"}
            description={showUpcoming ? "Great! No tasks due in the next few days." : "Create your first task to get started."}
            variant="compact"
          />
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {task.status}
                    </Badge>
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(task.due_date)}
                      </div>
                    )}
                  </div>
                </div>
                <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

