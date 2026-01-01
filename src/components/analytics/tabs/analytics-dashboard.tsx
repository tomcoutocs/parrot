"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { 
  TrendingUp, 
  Users,
  Activity,
  FolderKanban,
  CheckSquare,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Clock
} from 'lucide-react'
import { getAnalyticsStats } from '@/lib/analytics-functions'
import { formatDistanceToNow } from 'date-fns'

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    formSubmissions: 0,
    activityCount: 0,
    userGrowth: [] as Array<{ date: string; count: number }>,
    projectStatusBreakdown: [] as Array<{ status: string; count: number }>,
    taskStatusBreakdown: [] as Array<{ status: string; count: number }>,
    recentActivities: [] as Array<{
      id: string
      description: string
      created_at: string
      user?: { full_name: string; email: string }
    }>,
  })

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      try {
        const analyticsData = await getAnalyticsStats()
        setStats(analyticsData)
      } catch (error) {
        console.error('Error loading analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  // Calculate derived metrics
  const taskCompletionRate = stats.totalTasks > 0 
    ? ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1)
    : '0'
  
  const activeUserRate = stats.totalUsers > 0
    ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)
    : '0'

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      description: `${stats.activeUsers} active (${activeUserRate}%)`,
      trend: 'up' as const,
      change: `${stats.activeUsers > 0 ? '+' : ''}${stats.activeUsers}`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Total Projects',
      value: stats.totalProjects.toLocaleString(),
      description: `${stats.activeProjects} active`,
      trend: 'up' as const,
      change: `${stats.activeProjects > 0 ? '+' : ''}${stats.activeProjects}`,
      icon: FolderKanban,
      color: 'text-emerald-600',
    },
    {
      title: 'Total Tasks',
      value: stats.totalTasks.toLocaleString(),
      description: `${stats.completedTasks} completed (${taskCompletionRate}%)`,
      trend: 'up' as const,
      change: `${stats.completedTasks > 0 ? '+' : ''}${stats.completedTasks}`,
      icon: CheckSquare,
      color: 'text-violet-600',
    },
    {
      title: 'Form Submissions',
      value: stats.formSubmissions.toLocaleString(),
      description: 'Total submissions',
      trend: 'up' as const,
      change: `${stats.formSubmissions > 0 ? '+' : ''}${stats.formSubmissions}`,
      icon: FileText,
      color: 'text-amber-600',
    },
    {
      title: 'Activities',
      value: stats.activityCount.toLocaleString(),
      description: 'Last 30 days',
      trend: 'up' as const,
      change: `${stats.activityCount > 0 ? '+' : ''}${stats.activityCount}`,
      icon: Activity,
      color: 'text-rose-600',
    },
    {
      title: 'Task Completion',
      value: `${taskCompletionRate}%`,
      description: `${stats.completedTasks} of ${stats.totalTasks} tasks`,
      trend: stats.completedTasks > 0 ? 'up' as const : 'down' as const,
      change: `${taskCompletionRate}%`,
      icon: TrendingUp,
      color: 'text-indigo-600',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline">Export</Button>
        <Button>Create Report</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-600 mr-1" />}
                  {stat.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-600 mr-1" />}
                  <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                    {stat.change}
                  </span>
                  <span className="ml-1">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.projectStatusBreakdown.length > 0 ? (
              <div className="space-y-4">
                {stats.projectStatusBreakdown.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{item.status}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full"
                          style={{ 
                            width: `${(item.count / stats.totalProjects) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No project data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.taskStatusBreakdown.length > 0 ? (
              <div className="space-y-4">
                {stats.taskStatusBreakdown.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{item.status}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ 
                            width: `${(item.count / stats.totalTasks) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No task data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.userGrowth.length > 0 ? (
              <div className="h-64 flex items-end justify-between gap-1">
                {stats.userGrowth.slice(-14).map((item, index) => {
                  const maxCount = Math.max(...stats.userGrowth.map(g => g.count), 1)
                  const height = (item.count / maxCount) * 100
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-blue-600 rounded-t transition-all"
                        style={{ height: `${height}%`, minHeight: item.count > 0 ? '4px' : '0' }}
                      />
                      <span className="text-xs text-muted-foreground transform -rotate-45 origin-top-left whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No user growth data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivities.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user?.full_name || activity.user?.email || 'System'} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
