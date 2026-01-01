"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search,
  Filter,
  Download,
  Database,
  Table as TableIcon,
  RefreshCw,
  Plus,
  Loader2
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { fetchUsers, fetchProjects, fetchTasks } from '@/lib/database-functions'

interface TableData {
  id: string
  [key: string]: any
}

export function AnalyticsDataExplorer() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTable, setSelectedTable] = useState('users')
  const [data, setData] = useState<TableData[]>([])
  const [loading, setLoading] = useState(false)
  const [columns, setColumns] = useState<string[]>([])

  const tables = [
    { id: 'users', name: 'Users', description: 'User data and activity' },
    { id: 'projects', name: 'Projects', description: 'Project information' },
    { id: 'tasks', name: 'Tasks', description: 'Task data' },
    { id: 'activity_logs', name: 'Activity Logs', description: 'User activity tracking' },
    { id: 'spaces', name: 'Workspaces', description: 'Client workspace information' },
    { id: 'form_submissions', name: 'Form Submissions', description: 'Form submission counts and metadata' },
    { id: 'saved_reports', name: 'Saved Reports', description: 'User saved report configurations' },
    { id: 'project_members', name: 'Project Members', description: 'Project team member assignments' },
  ]

  useEffect(() => {
    loadTableData()
  }, [selectedTable])

  const loadTableData = async () => {
    setLoading(true)
    try {
      let tableData: TableData[] = []
      let tableColumns: string[] = []

      switch (selectedTable) {
        case 'users': {
          const users = await fetchUsers()
          tableData = users.map(user => ({
            id: user.id,
            name: user.full_name || 'N/A',
            email: user.email,
            role: user.role,
            created: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
            active: user.is_active ? 'Yes' : 'No',
          }))
          tableColumns = ['name', 'email', 'role', 'created', 'active']
          break
        }
        case 'projects': {
          const projects = await fetchProjects()
          tableData = projects.map(project => ({
            id: project.id,
            name: project.name || 'N/A',
            status: project.status || 'N/A',
            created: project.created_at ? new Date(project.created_at).toLocaleDateString() : 'N/A',
            manager: (project.manager as any)?.full_name || 'N/A',
            tasks: (project.tasks as any[])?.length || 0,
          }))
          tableColumns = ['name', 'status', 'created', 'manager', 'tasks']
          break
        }
        case 'tasks': {
          const tasks = await fetchTasks()
          tableData = tasks.map(task => ({
            id: task.id,
            title: task.title || 'N/A',
            status: task.status || 'N/A',
            priority: task.priority || 'N/A',
            assigned: (task.assigned_user as any)?.full_name || 'Unassigned',
            created: task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A',
          }))
          tableColumns = ['title', 'status', 'priority', 'assigned', 'created']
          break
        }
        case 'activity_logs': {
          if (!supabase) break
          const { data: activities } = await supabase
            .from('activity_logs')
            .select('id, action_type, entity_type, description, created_at, user:users!activity_logs_user_id_fkey(full_name, email)')
            .order('created_at', { ascending: false })
            .limit(100)
          
          tableData = (activities || []).map(activity => ({
            id: activity.id,
            action: activity.action_type || 'N/A',
            entity: activity.entity_type || 'N/A',
            description: activity.description || 'N/A',
            user: (activity.user as any)?.full_name || (activity.user as any)?.email || 'System',
            created: activity.created_at ? new Date(activity.created_at).toLocaleDateString() : 'N/A',
          }))
          tableColumns = ['action', 'entity', 'description', 'user', 'created']
          break
        }
        case 'spaces': {
          if (!supabase) break
          // Try spaces table first, fallback to companies
          let { data: spaces } = await supabase
            .from('spaces')
            .select('id, name, created_at, is_active')
            .order('name', { ascending: true })
            .limit(100)
          
          if (!spaces) {
            const { data: companies } = await supabase
              .from('companies')
              .select('id, name, created_at, is_active')
              .order('name', { ascending: true })
              .limit(100)
            spaces = companies
          }
          
          tableData = (spaces || []).map(space => ({
            id: space.id,
            name: space.name || 'N/A',
            active: space.is_active ? 'Yes' : 'No',
            created: space.created_at ? new Date(space.created_at).toLocaleDateString() : 'N/A',
          }))
          tableColumns = ['name', 'active', 'created']
          break
        }
        case 'form_submissions': {
          if (!supabase) break
          const { data: submissions } = await supabase
            .from('form_submissions')
            .select('id, created_at, form:forms(id, name), user:users!form_submissions_user_id_fkey(full_name)')
            .order('created_at', { ascending: false })
            .limit(100)
          
          tableData = (submissions || []).map(submission => ({
            id: submission.id,
            form: (submission.form as any)?.name || 'N/A',
            user: (submission.user as any)?.full_name || 'Anonymous',
            created: submission.created_at ? new Date(submission.created_at).toLocaleDateString() : 'N/A',
          }))
          tableColumns = ['form', 'user', 'created']
          break
        }
        case 'saved_reports': {
          if (!supabase) break
          const { data: reports } = await supabase
            .from('saved_reports')
            .select('id, name, description, chart_type, date_range, created_at, last_run')
            .order('created_at', { ascending: false })
            .limit(100)
          
          tableData = (reports || []).map(report => ({
            id: report.id,
            name: report.name || 'N/A',
            chart_type: report.chart_type || 'N/A',
            date_range: report.date_range ? report.date_range.replace(/_/g, ' ') : 'N/A',
            created: report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A',
            last_run: report.last_run ? new Date(report.last_run).toLocaleDateString() : 'Never',
          }))
          tableColumns = ['name', 'chart_type', 'date_range', 'created', 'last_run']
          break
        }
        case 'project_members': {
          if (!supabase) break
          const { data: members } = await supabase
            .from('project_members')
            .select('id, role, created_at, user:users!project_members_user_id_fkey(full_name, email), project:projects!project_members_project_id_fkey(name)')
            .order('created_at', { ascending: false })
            .limit(100)
          
          tableData = (members || []).map(member => ({
            id: member.id,
            project: (member.project as any)?.name || 'N/A',
            member: (member.user as any)?.full_name || (member.user as any)?.email || 'N/A',
            role: member.role || 'N/A',
            created: member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A',
          }))
          tableColumns = ['project', 'member', 'role', 'created']
          break
        }
      }

      setData(tableData)
      setColumns(tableColumns)
    } catch (error) {
      console.error('Error loading table data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredData = data.filter(row => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchLower)
    )
  })

  const handleExport = () => {
    const csv = [
      columns.join(','),
      ...filteredData.map(row => 
        columns.map(col => {
          const value = row[col] || ''
          return `"${String(value).replace(/"/g, '""')}"`
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTable}_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
        <Button variant="outline" onClick={loadTableData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tables Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Data Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTable === table.id
                      ? 'bg-muted border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TableIcon className="w-4 h-4" />
                    <span className="font-medium text-sm">{table.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{table.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{tables.find(t => t.id === selectedTable)?.name || 'Data'}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                  <Database className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? 'No results found' : 'No data available'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col} className="capitalize">
                            {col.replace(/_/g, ' ')}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((row) => (
                        <TableRow key={row.id}>
                          {columns.map((col) => (
                            <TableCell key={col} className="max-w-xs truncate">
                              {row[col] || 'N/A'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 text-sm text-muted-foreground">
                    Showing {filteredData.length} of {data.length} rows
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
