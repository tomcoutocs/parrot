"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAnalyticsStats } from '@/lib/analytics-functions'
import { AnalyticsBarChart } from '../charts/bar-chart'
import { AnalyticsLineChart } from '../charts/line-chart'
import { AnalyticsPieChart } from '../charts/pie-chart'
import { AnalyticsAreaChart } from '../charts/area-chart'

export function AnalyticsVisualizations() {
  const [timeRange, setTimeRange] = useState('last_30_days')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    userGrowth: [] as Array<{ date: string; count: number }>,
    projectStatusBreakdown: [] as Array<{ status: string; count: number }>,
    taskStatusBreakdown: [] as Array<{ status: string; count: number }>,
    totalUsers: 0,
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
  })

  useEffect(() => {
    loadData()
  }, [timeRange])

  const loadData = async () => {
    setLoading(true)
    try {
      const analyticsData = await getAnalyticsStats()
      setStats(analyticsData)
    } catch (error) {
      console.error('Error loading visualization data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format user growth data for charts
  const userGrowthData = stats.userGrowth.slice(-14).map(item => ({
    name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.count,
  }))

  // Format project status data
  const projectStatusData = stats.projectStatusBreakdown.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
  }))

  // Format task status data
  const taskStatusData = stats.taskStatusBreakdown.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
  }))

  // User activity comparison (simulated - would need more data)
  const userActivityData = [
    { name: 'Active', value: stats.totalUsers - (stats.totalUsers * 0.3) },
    { name: 'Inactive', value: stats.totalUsers * 0.3 },
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
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_7_days">Last 7 days</SelectItem>
            <SelectItem value="last_30_days">Last 30 days</SelectItem>
            <SelectItem value="last_90_days">Last 90 days</SelectItem>
            <SelectItem value="last_year">Last year</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {userGrowthData.length > 0 ? (
                    <AnalyticsLineChart data={userGrowthData} color="#3b82f6" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No user growth data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {projectStatusData.length > 0 ? (
                    <AnalyticsPieChart data={projectStatusData} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No project data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {taskStatusData.length > 0 ? (
                    <AnalyticsBarChart data={taskStatusData} color="#10b981" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No task data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Completion Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {taskStatusData.length > 0 ? (
                    <AnalyticsAreaChart data={taskStatusData} color="#8b5cf6" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No task data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Growth Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                {userGrowthData.length > 0 ? (
                  <AnalyticsLineChart data={userGrowthData} color="#3b82f6" />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>No user growth data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  {projectStatusData.length > 0 ? (
                    <AnalyticsPieChart data={projectStatusData} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No project data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projects by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  {projectStatusData.length > 0 ? (
                    <AnalyticsBarChart data={projectStatusData} color="#f59e0b" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No project data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  {taskStatusData.length > 0 ? (
                    <AnalyticsBarChart data={taskStatusData} color="#10b981" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No task data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  {taskStatusData.length > 0 ? (
                    <AnalyticsPieChart data={taskStatusData} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No task data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
