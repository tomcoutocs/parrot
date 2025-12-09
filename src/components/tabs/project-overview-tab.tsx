"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { fetchTasks, fetchSpaces, fetchProjects } from '@/lib/database-functions'
import type { TaskWithDetails, Company, ProjectWithDetails } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Building2,
  Eye,
  Download
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-states'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface TaskWithCompany extends TaskWithDetails {
  company?: {
    id: string
    name: string
    industry?: string
  }
  project?: {
    id: string
    title: string
  }
}

export default function ProjectOverviewTab() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<TaskWithCompany[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [session?.user?.role, session?.user?.company_id])

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch projects based on user role
      let allProjects: ProjectWithDetails[]
      if (session?.user.role === 'admin') {
        // Admin can see all projects
        allProjects = await fetchProjects()
      } else if (session?.user.role === 'manager') {
        // Manager can only see projects from their company
        allProjects = await fetchProjects(session.user.company_id)
      } else {
        // Other users shouldn't see this tab, but just in case
        allProjects = []
      }
      
      // Fetch companies based on user role
      let allCompanies: Company[]
      if (session?.user.role === 'admin') {
        // Admin can see all companies
        allCompanies = await fetchSpaces()
      } else if (session?.user.role === 'manager') {
        // Manager can only see their own company
        const allCompaniesData = await fetchSpaces()
        allCompanies = session.user.company_id 
          ? allCompaniesData.filter(c => c.id === session.user.company_id)
          : []
      } else {
        allCompanies = []
      }
      
      // Fetch tasks based on user role
      let allTasks: TaskWithDetails[]
      if (session?.user.role === 'admin') {
        // Admin can see all tasks
        allTasks = await fetchTasks()
      } else if (session?.user.role === 'manager') {
        // Manager can only see tasks from their company's projects
        // First get all tasks, then filter by project IDs
        const allTasksData = await fetchTasks()
        const projectIds = allProjects.map(p => p.id)
        allTasks = allTasksData.filter(task => projectIds.includes(task.project_id))
      } else {
        allTasks = []
      }
      
      // Combine tasks with company and project data, and filter out tasks from archived projects
      const tasksWithCompany = allTasks
        .map(task => {
          const project = allProjects.find(p => p.id === task.project_id)
          const company = project ? allCompanies.find(c => c.id === project.company_id) : undefined
          return {
            ...task,
            company: company ? {
              id: company.id,
              name: company.name,
              industry: company.industry
            } : undefined,
            project: project ? {
              id: project.id,
              title: project.name
            } : undefined
          }
        })
        .filter(task => {
          // Filter out tasks from archived projects (if project is not in allProjects, it's archived)
          return task.project !== undefined
        })

             setTasks(tasksWithCompany)
       setCompanies(allCompanies)
       setProjects(allProjects)
       
               // Debug logging
        console.log('Projects fetched:', allProjects.length, allProjects.map(p => ({ id: p.id, name: p.name })))
        console.log('Companies fetched:', allCompanies.length, allCompanies.map(c => ({ id: c.id, name: c.name })))
        console.log('Tasks fetched:', allTasks.length)
        console.log('Task statuses:', [...new Set(allTasks.map(t => t.status))])
        console.log('Sample tasks:', allTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title, status: t.status, due_date: t.due_date })))
    } catch (error) {
      console.error('Error loading task overview data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Memoize filtered tasks based on search and filters
  const filteredTasks = useMemo(() => {
    const searchLower = (searchTerm || '').toLowerCase()
    return tasks.filter(task => {
      const matchesSearch = !searchTerm || 
                        task.title.toLowerCase().includes(searchLower) ||
                        task.description?.toLowerCase().includes(searchLower) ||
                        task.company?.name?.toLowerCase().includes(searchLower) ||
                        task.project?.title?.toLowerCase().includes(searchLower)
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter
      const matchesCompany = companyFilter === 'all' || task.company?.id === companyFilter
      const matchesProject = projectFilter === 'all' || task.project?.id === projectFilter
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesCompany && matchesProject && matchesPriority
    })
  }, [tasks, searchTerm, statusFilter, companyFilter, projectFilter, priorityFilter])

  // Memoize statistics calculations
  const statistics = useMemo(() => {
    const totalTasks = tasks.length
    const activeTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length
    const completedTasks = tasks.filter(t => t.status === 'done').length
    const overdueTasks = tasks.filter(t => {
      if ((t.status === 'todo' || t.status === 'in_progress') && t.due_date) {
        return new Date(t.due_date) < new Date()
      }
      return false
    }).length
    
    return { totalTasks, activeTasks, completedTasks, overdueTasks }
  }, [tasks])
  
  const { totalTasks, activeTasks, completedTasks, overdueTasks } = statistics

  // Memoize helper functions to avoid recreating on every render
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'done': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-yellow-100 text-yellow-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800' // Backwards compatibility
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const formatDate = useCallback((dateString: string | undefined) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString()
  }, [])

  const isOverdue = useCallback((dueDate: string | undefined) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }, [])

  const downloadCSV = () => {
    // Create CSV header
    const headers = [
      'Task Title',
      'Description',
      'Project',
      'Company',
      'Status',
      'Priority',
      'Assigned User',
      'Due Date',
      'Estimated Hours',
      'Actual Hours',
      'Created Date'
    ]

    // Create CSV rows
    const rows = filteredTasks.map(task => [
      task.title || '',
      task.description || '',
      task.project?.title || '',
      task.company?.name || '',
      task.status || '',
      task.priority || '',
      task.assigned_user?.full_name || 'Unassigned',
      task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date',
      task.estimated_hours || 0,
      task.actual_hours || 0,
      task.created_at ? new Date(task.created_at).toLocaleDateString() : ''
    ])

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (session?.user.role !== 'admin' && session?.user.role !== 'manager') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This tab is only available to administrators and managers.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Overview</h1>
          <p className="text-gray-600 mt-1">
            {session?.user.role === 'admin' 
              ? 'Track all tasks across all companies' 
              : 'Track tasks for your assigned company'
            }
          </p>
        </div>
                 <div className="flex items-center space-x-2">
           <Button onClick={loadData} variant="outline">
             <Eye className="h-4 w-4 mr-2" />
             Refresh Data
           </Button>
         </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
                         <p className="text-xs text-muted-foreground">
               {session?.user.role === 'admin' ? 'Across all companies' : 'For your company'}
             </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeTasks}</div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              Successfully finished
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
                 <CardContent>
           <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
             <div className="space-y-2">
               <label className="text-sm font-medium">Search</label>
               <div className="relative">
                 <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                 <Input
                   placeholder="Search tasks..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-10"
                 />
               </div>
             </div>

             <div className="space-y-2">
               <label className="text-sm font-medium">Status</label>
               <Select value={statusFilter} onValueChange={setStatusFilter}>
                 <SelectTrigger>
                   <SelectValue placeholder="All Statuses" />
                 </SelectTrigger>
                                   <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
               </Select>
             </div>

             <div className="space-y-2">
               <label className="text-sm font-medium">Company</label>
               <Select value={companyFilter} onValueChange={setCompanyFilter}>
                 <SelectTrigger>
                   <SelectValue placeholder="All Companies" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Companies</SelectItem>
                   {companies.map(company => (
                     <SelectItem key={company.id} value={company.id}>
                       {company.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

                           <div className="space-y-2">
                <label className="text-sm font-medium">Project</label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

             <div className="space-y-2">
               <label className="text-sm font-medium">Priority</label>
               <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                 <SelectTrigger>
                   <SelectValue placeholder="All Priorities" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Priorities</SelectItem>
                   <SelectItem value="high">High</SelectItem>
                   <SelectItem value="medium">Medium</SelectItem>
                   <SelectItem value="low">Low</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
         </CardContent>
      </Card>

             {/* Tasks Table */}
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <CardTitle>All Tasks ({filteredTasks.length})</CardTitle>
             <Button onClick={downloadCSV} variant="outline" disabled={filteredTasks.length === 0}>
               <Download className="h-4 w-4 mr-2" />
               Export CSV
             </Button>
           </div>
         </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned User</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {task.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                                                 <span>{task.project?.title || 'Unknown Project'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{task.company?.name || 'Unknown Company'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(task.priority || 'normal')}>
                        {(task.priority as string) === 'medium' ? 'normal' : (task.priority || 'normal')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        <span>{task.assigned_user?.full_name || 'Unassigned'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        <span className={isOverdue(task.due_date) ? 'text-red-600 font-medium' : ''}>
                          {formatDate(task.due_date)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No tasks found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
