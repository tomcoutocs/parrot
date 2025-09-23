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
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  HelpCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import EmptyState from '@/components/ui/empty-state'
import { LoadingGrid, DataLoadingState, InlineLoading } from '@/components/ui/loading-states'
import { EnhancedTooltip, tooltipContent } from '@/components/ui/enhanced-tooltips'
import { 
  fetchProjectsOptimized, 
  fetchTasksOptimized, 
  fetchCompaniesOptimized, 
  fetchUsersOptimized,
  fetchFormsOptimized
} from '@/lib/simplified-database-functions'
import type { 
  ProjectWithDetails, 
  TaskWithDetails, 
  Company, 
  User, 
  Form
} from '@/lib/supabase'

interface DashboardLandingTabProps {
  onNavigateToTab?: (tab: string) => void
}

export default function DashboardLandingTab({ onNavigateToTab }: DashboardLandingTabProps) {
  const { data: session } = useSession()
  const [companies, setCompanies] = useState<Company[]>([])
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [users, setUsers] = useState<User[]>([])
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
      // Fetch all data in parallel for admin dashboard
      const [companiesData, tasksData, formsData, usersData] = await Promise.all([
        fetchCompaniesOptimized(),
        fetchTasksOptimized(),
        fetchFormsOptimized(),
        fetchUsersOptimized()
      ])

      setCompanies(companiesData || [])
      setTasks(tasksData || [])
      setForms(formsData || [])
      setUsers(usersData || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Helper functions for admin dashboard
  const getTasksDueWithin24Hours = () => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    return tasks.filter(task => {
      if (!task.due_date) return false
      const dueDate = new Date(task.due_date)
      return dueDate >= now && dueDate <= tomorrow && task.status !== 'done'
    })
  }

  const getActiveClients = () => {
    return companies.filter(company => company.is_active)
  }

  const formatDate = (dateString: string) => {
    try {
      // If it's already in YYYY-MM-DD format, parse it as local date
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
      
      // For ISO dates (including our noon UTC dates), use UTC methods
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingGrid count={6} />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold parrot-gradient-text">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {session?.user.name}! Here&apos;s your admin overview.
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

      {/* Admin Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Clients List */}
        <Card className="parrot-card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Active Clients ({getActiveClients().length})
              <EnhancedTooltip content="View all companies and clients in your system" variant="info">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
              </EnhancedTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {getActiveClients().map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-500">{client.website || 'No website'}</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>
              ))}
              {getActiveClients().length === 0 && (
                <EmptyState
                  icon={Building2}
                  title="No active clients"
                  description="No clients are currently active. Add some clients to get started."
                  variant="compact"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Due Within 24 Hours */}
        <Card className="parrot-card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Tasks Due Within 24 Hours ({getTasksDueWithin24Hours().length})
              <EnhancedTooltip content="Tasks that need to be completed within the next 24 hours" variant="warning">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
              </EnhancedTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {getTasksDueWithin24Hours().map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">
                      Due: {formatDate(task.due_date!)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    {task.priority}
                  </Badge>
                </div>
              ))}
              {getTasksDueWithin24Hours().length === 0 && (
                <EmptyState
                  icon={Clock}
                  title="No tasks due soon"
                  description="Great! No tasks are due within the next 24 hours. You're all caught up!"
                  variant="compact"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview of All Tasks */}
        <Card className="parrot-card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Kanban className="h-5 w-5 mr-2" />
              All Tasks Preview ({tasks.length})
              <EnhancedTooltip content="Overview of all tasks across all projects" variant="info">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
              </EnhancedTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {tasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">
                      Status: {task.status} | Priority: {task.priority}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {task.status}
                  </Badge>
                </div>
              ))}
              {tasks.length > 10 && (
                <p className="text-gray-500 text-center py-2">
                  Showing 10 of {tasks.length} tasks
                </p>
              )}
              {tasks.length === 0 && (
                <EmptyState
                  icon={Kanban}
                  title="No tasks found"
                  description="Create your first task to start organizing your work and tracking progress."
                  variant="compact"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Forms */}
        <Card className="parrot-card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Forms ({forms.length})
              <EnhancedTooltip content="Create and manage forms for data collection" variant="info">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
              </EnhancedTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {forms.map((form) => (
                <div key={form.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{form.title}</p>
                    <p className="text-sm text-gray-500">{form.description}</p>
                  </div>
                  <Badge variant={form.is_active ? "default" : "secondary"}>
                    {form.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
              {forms.length === 0 && (
                <EmptyState
                  icon={FileText}
                  title="No forms found"
                  description="Create forms to collect information from clients and team members."
                  variant="compact"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users */}
        <Card className="parrot-card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Users ({users.length})
              <EnhancedTooltip content="Manage user accounts and team members" variant="info">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
              </EnhancedTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <Badge variant="outline">
                    {user.role}
                  </Badge>
                </div>
              ))}
              {users.length === 0 && (
                <EmptyState
                  icon={Users}
                  title="No users found"
                  description="Invite team members to collaborate on projects and tasks."
                  variant="compact"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Events Within 24 Hours */}
        <Card className="parrot-card-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Calendar Events (Coming Soon)
              <EnhancedTooltip content="Calendar integration will show upcoming events and meetings" variant="info">
                <HelpCircle className="h-4 w-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
              </EnhancedTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Calendar events integration coming soon!</p>
              <p className="text-sm mt-2">This will show events within the next 24 hours</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}