'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { 
  Kanban, 
  FileText, 
  Settings, 
  Calendar, 
  Building2, 
  FolderOpen, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Activity,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  fetchProjectsOptimized, 
  fetchTasksOptimized, 
  fetchCompaniesOptimized, 
  fetchUsersOptimized,
  fetchFormsOptimized,
  fetchServicesOptimized
} from '@/lib/simplified-database-functions'
import type { 
  ProjectWithDetails, 
  TaskWithDetails, 
  Company, 
  User, 
  Form, 
  Service 
} from '@/lib/supabase'

interface DashboardStats {
  projects: {
    total: number
    active: number
    completed: number
  }
  tasks: {
    total: number
    assigned: number
    completed: number
    overdue: number
  }
  forms: {
    total: number
    submissions: number
  }
  services: {
    total: number
    active: number
  }
  companies?: {
    total: number
    active: number
  }
  users?: {
    total: number
    active: number
  }
}

interface DashboardLandingTabProps {
  onNavigateToTab?: (tab: string) => void
}

export default function DashboardLandingTab({ onNavigateToTab }: DashboardLandingTabProps) {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const userRole = session?.user?.role
      const userCompanyId = session?.user?.company_id
      
      // Fetch data based on user role
      const [projects, tasks, forms, services] = await Promise.all([
        fetchProjectsOptimized(userRole === 'admin' ? undefined : userCompanyId),
        fetchTasksOptimized(),
        fetchFormsOptimized(),
        fetchServicesOptimized()
      ])

      // Fetch admin-only data
      let companies: Company[] = []
      let users: User[] = []
      
      if (userRole === 'admin') {
        [companies, users] = await Promise.all([
          fetchCompaniesOptimized(),
          fetchUsersOptimized()
        ])
      }

      // Calculate statistics
      const now = new Date()
      const stats: DashboardStats = {
        projects: {
          total: projects.length,
          active: projects.filter(p => p.status === 'active').length,
          completed: projects.filter(p => p.status === 'completed').length
        },
        tasks: {
          total: tasks.length,
          assigned: tasks.filter(t => t.assigned_to).length,
          completed: tasks.filter(t => t.status === 'done').length,
          overdue: tasks.filter(t => 
            t.due_date && 
            new Date(t.due_date) < now && 
            t.status !== 'done'
          ).length
        },
        forms: {
          total: forms.length,
          submissions: 0 // TODO: Calculate actual submission count
        },
        services: {
          total: services.length,
          active: services.filter(s => s.is_active).length
        }
      }

      // Add admin-only stats
      if (userRole === 'admin') {
        stats.companies = {
          total: companies.length,
          active: companies.filter(c => c.is_active).length
        }
        stats.users = {
          total: users.length,
          active: users.filter(u => u.is_active).length
        }
      }

      setStats(stats)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadDashboardData} variant="outline" className="parrot-button-primary">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {session?.user.name}! Here&apos;s an overview of your workspace.
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button onClick={loadDashboardData} variant="outline" className="parrot-button-primary">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Projects Overview */}
        <Card 
          className="parrot-card-dark hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onNavigateToTab?.('projects')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Kanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects.total}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="default" className="text-xs">
                {stats.projects.active} Active
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.projects.completed} Completed
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Manage your projects and tasks
            </p>
          </CardContent>
        </Card>

        {/* Tasks Overview */}
        <Card 
          className="parrot-card-dark hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onNavigateToTab?.('projects')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks.total}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="default" className="text-xs">
                {stats.tasks.assigned} Assigned
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {stats.tasks.completed} Completed
              </Badge>
              {stats.tasks.overdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.tasks.overdue} Overdue
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Track your assigned tasks
            </p>
          </CardContent>
        </Card>

        {/* Forms Overview */}
        <Card 
          className="parrot-card-dark hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onNavigateToTab?.('forms')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forms</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.forms.total}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="default" className="text-xs">
                {stats.forms.submissions} Submissions
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Create and manage forms
            </p>
          </CardContent>
        </Card>

        {/* Services Overview */}
        <Card 
          className="parrot-card-dark hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onNavigateToTab?.('services')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.services.total}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="default" className="text-xs">
                {stats.services.active} Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Manage available services
            </p>
          </CardContent>
        </Card>

        {/* Calendar Overview */}
        <Card 
          className="parrot-card-dark hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onNavigateToTab?.('calendar')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calendar</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-2">
              View and manage your calendar
            </p>
          </CardContent>
        </Card>

        {/* Documents Overview */}
        <Card 
          className="parrot-card-dark hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onNavigateToTab?.('documents')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-2">
              Manage your documents
            </p>
          </CardContent>
        </Card>

        {/* Admin-only cards */}
        {session?.user.role === 'admin' && (
          <>
            {/* Companies Overview */}
            <Card 
              className="parrot-card-dark hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onNavigateToTab?.('companies')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Companies</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.companies?.total || 0}</div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="default" className="text-xs">
                    {stats.companies?.active || 0} Active
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Manage client companies
                </p>
              </CardContent>
            </Card>

            {/* Users Overview */}
            <Card 
              className="parrot-card-dark hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onNavigateToTab?.('admin')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users?.total || 0}</div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="default" className="text-xs">
                    {stats.users?.active || 0} Active
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Manage system users
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="h-20 flex flex-col items-center justify-center parrot-card-dark hover:shadow-md transition-shadow">
            <Kanban className="h-6 w-6 mb-2" />
            <span className="text-sm">View Projects</span>
          </Button>
          <Button variant="outline" className="h-20 flex flex-col items-center justify-center parrot-card-dark hover:shadow-md transition-shadow">
            <FileText className="h-6 w-6 mb-2" />
            <span className="text-sm">Create Form</span>
          </Button>
          <Button variant="outline" className="h-20 flex flex-col items-center justify-center parrot-card-dark hover:shadow-md transition-shadow">
            <Calendar className="h-6 w-6 mb-2" />
            <span className="text-sm">Schedule Meeting</span>
          </Button>
          <Button variant="outline" className="h-20 flex flex-col items-center justify-center parrot-card-dark hover:shadow-md transition-shadow">
            <Settings className="h-6 w-6 mb-2" />
            <span className="text-sm">Manage Services</span>
          </Button>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <Card className="parrot-card-dark">
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Recent activity will be displayed here</p>
              <p className="text-sm mt-2">This feature is coming soon!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
