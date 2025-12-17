"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  Users,
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MousePointerClick,
  Clock
} from 'lucide-react'

export function AnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pageViews: 0,
    sessions: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    conversionRate: 0,
    revenue: 0,
  })

  useEffect(() => {
    // TODO: Fetch real data from database
    setStats({
      totalUsers: 1247,
      activeUsers: 856,
      pageViews: 45230,
      sessions: 12340,
      avgSessionDuration: 245,
      bounceRate: 32.5,
      conversionRate: 4.2,
      revenue: 245000,
    })
  }, [])

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      description: `${stats.activeUsers} active today`,
      trend: 'up' as const,
      change: '+12%',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Page Views',
      value: stats.pageViews.toLocaleString(),
      description: 'Last 30 days',
      trend: 'up' as const,
      change: '+8%',
      icon: Eye,
      color: 'text-emerald-600',
    },
    {
      title: 'Sessions',
      value: stats.sessions.toLocaleString(),
      description: `${(stats.sessions / 30).toFixed(0)} avg per day`,
      trend: 'up' as const,
      change: '+5%',
      icon: Activity,
      color: 'text-violet-600',
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      description: 'Goal completions',
      trend: 'up' as const,
      change: '+0.8%',
      icon: TrendingUp,
      color: 'text-amber-600',
    },
    {
      title: 'Avg Session Duration',
      value: `${Math.floor(stats.avgSessionDuration / 60)}:${(stats.avgSessionDuration % 60).toString().padStart(2, '0')}`,
      description: 'Minutes per session',
      trend: 'up' as const,
      change: '+3%',
      icon: Clock,
      color: 'text-rose-600',
    },
    {
      title: 'Bounce Rate',
      value: `${stats.bounceRate}%`,
      description: 'Single-page sessions',
      trend: 'down' as const,
      change: '-2.1%',
      icon: MousePointerClick,
      color: 'text-indigo-600',
    },
  ]

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
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">User growth chart will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Traffic sources chart will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Dashboard', 'Projects', 'Documents', 'Calendar', 'Forms'].map((page, index) => (
                <div key={page} className="flex items-center justify-between">
                  <span className="text-sm">{page}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${100 - index * 15}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {Math.floor(Math.random() * 5000) + 1000}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real-Time Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium">User viewing Dashboard</p>
                  <p className="text-xs text-muted-foreground">2 seconds ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New user signed up</p>
                  <p className="text-xs text-muted-foreground">15 seconds ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Project created</p>
                  <p className="text-xs text-muted-foreground">1 minute ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

