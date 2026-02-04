"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2,
  Plus, 
  Save,
  Download,
  Filter,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  TrendingUp,
  Sparkles,
  GripVertical,
  X,
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  Activity,
  Receipt,
  DollarSign,
  CreditCard,
  Building2,
  TrendingDown
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAnalyticsStats } from '@/lib/analytics-functions'
import { saveReport, getSavedReports, type SavedReport } from '@/lib/saved-reports-functions'
import { toastSuccess, toastError } from '@/lib/toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnalyticsBarChart } from '../charts/bar-chart'
import { AnalyticsLineChart } from '../charts/line-chart'
import { AnalyticsPieChart } from '../charts/pie-chart'
import { AIReportAgent } from '../ai-report-agent'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fetchCompaniesOptimized } from '@/lib/simplified-database-functions'
import { fetchUsersOptimized } from '@/lib/simplified-database-functions'
import type { Company, User } from '@/lib/supabase'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface ReportField {
  id: string
  name: string
  type: 'metric' | 'dimension'
  selected: boolean
}

// Icon mapping for metrics
const getFieldIcon = (id: string) => {
  const iconMap: Record<string, any> = {
    users: Users,
    projects: FolderKanban,
    tasks: CheckSquare,
    submissions: FileText,
    activities: Activity,
    invoices: Receipt,
    revenue: DollarSign,
    payments: CreditCard,
    clients: Building2,
    expenses: TrendingDown,
    page_views: BarChart3,
    user_behaviors: Activity,
    sessions: Activity,
    date: Calendar,
    status: Filter,
    role: Users,
    device: BarChart3,
    browser: BarChart3,
  }
  return iconMap[id] || BarChart3
}

// Neutral color for all fields (matching dimensions)
const getFieldColor = () => {
  return 'bg-muted/50 text-foreground border-border'
}

const availableFields: ReportField[] = [
  { id: 'users', name: 'Users', type: 'metric', selected: false },
  { id: 'projects', name: 'Projects', type: 'metric', selected: false },
  { id: 'tasks', name: 'Tasks', type: 'metric', selected: false },
  { id: 'submissions', name: 'Form Submissions', type: 'metric', selected: false },
  { id: 'activities', name: 'Activities', type: 'metric', selected: false },
  { id: 'invoices', name: 'Invoices', type: 'metric', selected: false },
  { id: 'revenue', name: 'Revenue', type: 'metric', selected: false },
  { id: 'payments', name: 'Payments', type: 'metric', selected: false },
  { id: 'clients', name: 'Clients', type: 'metric', selected: false },
  { id: 'expenses', name: 'Expenses', type: 'metric', selected: false },
  { id: 'page_views', name: 'Page Views', type: 'metric', selected: false },
  { id: 'user_behaviors', name: 'User Behaviors', type: 'metric', selected: false },
  { id: 'sessions', name: 'Sessions', type: 'metric', selected: false },
  { id: 'date', name: 'Date', type: 'dimension', selected: false },
  { id: 'status', name: 'Status', type: 'dimension', selected: false },
  { id: 'role', name: 'User Role', type: 'dimension', selected: false },
  { id: 'device', name: 'Device Type', type: 'dimension', selected: false },
  { id: 'browser', name: 'Browser', type: 'dimension', selected: false },
]

function EditableTableRow({ 
  label, 
  value, 
  change, 
  onLabelChange 
}: { 
  label: string
  value: number
  change: number
  onLabelChange: (newLabel: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(label)

  return (
    <tr className="border-b border-border hover:bg-muted/50">
      <td className="p-2">
        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              if (editValue !== label && editValue.trim()) {
                onLabelChange(editValue.trim())
              } else {
                setEditValue(label)
              }
              setIsEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (editValue !== label && editValue.trim()) {
                  onLabelChange(editValue.trim())
                } else {
                  setEditValue(label)
                }
                setIsEditing(false)
              }
              if (e.key === 'Escape') {
                setEditValue(label)
                setIsEditing(false)
              }
            }}
            className="h-8 text-sm text-foreground"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span 
            className="text-foreground cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsEditing(true)}
            title="Click to edit"
          >
            {label}
          </span>
        )}
      </td>
      <td className="text-right p-2 font-medium text-foreground">{value.toLocaleString()}</td>
      <td className="text-right p-2 text-green-600 dark:text-green-400 font-medium">+{change}</td>
    </tr>
  )
}

export function AnalyticsReports() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [reportName, setReportName] = useState('')
  const [dateRange, setDateRange] = useState('last_30_days')
  const [chartType, setChartType] = useState('bar')
  const [selectedFields, setSelectedFields] = useState<string[]>(['users', 'projects', 'tasks'])
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [xAxisLabel, setXAxisLabel] = useState('')
  const [yAxisLabel, setYAxisLabel] = useState('')
  const [reportLabels, setReportLabels] = useState<Record<number, string>>({})
  const [showAIAgent, setShowAIAgent] = useState(false)
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [spaces, setSpaces] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingFilters, setLoadingFilters] = useState(false)

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    )
  }

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    // Handle dragging from available to selected
    if (source.droppableId === 'available-fields' && destination.droppableId === 'selected-fields') {
      if (!selectedFields.includes(draggableId)) {
        setSelectedFields(prev => [...prev, draggableId])
      }
      return
    }

    // Handle removing from selected
    if (source.droppableId === 'selected-fields' && destination.droppableId === 'available-fields') {
      setSelectedFields(prev => prev.filter(id => id !== draggableId))
      return
    }

    // Handle reordering selected fields
    if (source.droppableId === 'selected-fields' && destination.droppableId === 'selected-fields') {
      if (source.index === destination.index) return
      
      const newFields = Array.from(selectedFields)
      const [removed] = newFields.splice(source.index, 1)
      newFields.splice(destination.index, 0, removed)
      setSelectedFields(newFields)
    }
  }

  // Load spaces and users for filters
  useEffect(() => {
    const loadFilters = async () => {
      setLoadingFilters(true)
      try {
        const [spacesData, usersData] = await Promise.all([
          fetchCompaniesOptimized(),
          fetchUsersOptimized()
        ])
        setSpaces(spacesData.filter(s => s.is_active))
        setUsers(usersData.filter(u => u.is_active !== false))
      } catch (error) {
        console.error('Error loading filters:', error)
      } finally {
        setLoadingFilters(false)
      }
    }
    loadFilters()
  }, [])

  const [reportData, setReportData] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const isInitialMount = useRef(true)
  const skipAutoGenerate = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const handleGenerateReportRef = useRef<(() => Promise<void>) | undefined>(undefined)
  const isGeneratingRef = useRef(false)

  const handleGenerateReport = useCallback(async () => {
    // Prevent concurrent calls
    if (isGeneratingRef.current) {
      return
    }
    
    isGeneratingRef.current = true
    setGenerating(true)
    try {
      // Calculate date range
      const to = new Date()
      let from = new Date()
      switch (dateRange) {
        case 'today':
          from = new Date(to.setHours(0, 0, 0, 0))
          break
        case 'yesterday':
          from = new Date(to)
          from.setDate(from.getDate() - 1)
          from.setHours(0, 0, 0, 0)
          to.setDate(to.getDate() - 1)
          to.setHours(23, 59, 59, 999)
          break
        case 'last_7_days':
          from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'last_30_days':
          from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'last_90_days':
          from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }

      // Generate report based on selections with filters - add timeout
      const analyticsDataPromise = getAnalyticsStats(
        { from, to },
        selectedSpaceId && selectedSpaceId !== 'all' ? selectedSpaceId : undefined,
        selectedUserId && selectedUserId !== 'all' ? selectedUserId : undefined
      )
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
      
      const analyticsData = await Promise.race([analyticsDataPromise, timeoutPromise]) as Awaited<ReturnType<typeof getAnalyticsStats>>
      
      // Build report data based on selected fields
      const data: any[] = []
      
      if (selectedFields.includes('users')) {
        data.push({
          metric: 'Total Users',
          value: analyticsData.totalUsers,
          change: analyticsData.activeUsers,
        })
      }
      if (selectedFields.includes('projects')) {
        data.push({
          metric: 'Total Projects',
          value: analyticsData.totalProjects,
          change: analyticsData.activeProjects,
        })
      }
      if (selectedFields.includes('tasks')) {
        data.push({
          metric: 'Total Tasks',
          value: analyticsData.totalTasks,
          change: analyticsData.completedTasks,
        })
      }
      if (selectedFields.includes('submissions')) {
        data.push({
          metric: 'Form Submissions',
          value: analyticsData.formSubmissions,
          change: 0,
        })
      }
      if (selectedFields.includes('activities')) {
        data.push({
          metric: 'Activities',
          value: analyticsData.activityCount,
          change: 0,
        })
      }
      if (selectedFields.includes('invoices')) {
        data.push({
          metric: 'Total Invoices',
          value: analyticsData.totalInvoices,
          change: analyticsData.paidInvoices,
        })
      }
      if (selectedFields.includes('revenue')) {
        data.push({
          metric: 'Total Revenue',
          value: analyticsData.totalRevenue,
          change: analyticsData.outstandingInvoices,
        })
      }
      if (selectedFields.includes('payments')) {
        data.push({
          metric: 'Total Payments',
          value: analyticsData.totalPayments,
          change: 0,
        })
      }
      if (selectedFields.includes('clients')) {
        data.push({
          metric: 'Total Clients',
          value: analyticsData.totalClients,
          change: 0,
        })
      }
      if (selectedFields.includes('expenses')) {
        data.push({
          metric: 'Total Expenses',
          value: analyticsData.totalExpenses,
          change: 0,
        })
      }
      
      setReportData(data)
    } catch (error) {
      console.error('Error generating report:', error)
      setReportData([])
    } finally {
      setGenerating(false)
      isGeneratingRef.current = false
    }
  }, [selectedFields, dateRange, chartType, selectedSpaceId, selectedUserId])

  // Keep ref updated with latest function
  useEffect(() => {
    handleGenerateReportRef.current = handleGenerateReport
  }, [handleGenerateReport])

  // Generate initial report only once on mount
  useEffect(() => {
    if (isInitialMount.current && selectedFields.length > 0) {
      isInitialMount.current = false
      const timeout = setTimeout(() => {
        if (handleGenerateReportRef.current && !isGeneratingRef.current) {
          handleGenerateReportRef.current()
        }
      }, 1000)
      return () => clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-generate report when configuration changes (but not on initial mount)
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      return
    }

    // Skip if we're manually skipping (e.g., loading saved report)
    if (skipAutoGenerate.current) {
      skipAutoGenerate.current = false
      return
    }

    // Skip if already generating
    if (isGeneratingRef.current) {
      return
    }

    // Only generate if we have selected fields
    if (selectedFields.length === 0) {
      setReportData([])
      setGenerating(false)
      return
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    // Debounce the report generation
    debounceTimerRef.current = setTimeout(() => {
      if (handleGenerateReportRef.current && !isGeneratingRef.current) {
        handleGenerateReportRef.current()
      }
      debounceTimerRef.current = null
    }, 1000)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [selectedFields, dateRange, chartType, selectedSpaceId, selectedUserId])

  // Load saved report if report ID is in URL
  useEffect(() => {
    const reportId = searchParams.get('report')
    if (reportId) {
      loadSavedReport(reportId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const loadSavedReport = async (reportId: string) => {
    try {
      skipAutoGenerate.current = true // Skip auto-generation during load
      const reports = await getSavedReports()
      const report = reports.find(r => r.id === reportId)
      if (report) {
        setReportName(report.name)
        setDateRange(report.dateRange)
        setChartType(report.chartType)
        setSelectedFields(report.selectedFields)
        setFilters(report.filters || {})
        // Load saved filters
        if (report.filters) {
          setSelectedSpaceId(report.filters.spaceId || 'all')
          setSelectedUserId(report.filters.userId || 'all')
        }
        // Generate the report automatically after state updates
        setTimeout(() => {
          handleGenerateReport()
        }, 100)
      }
    } catch (error) {
      console.error('Error loading saved report:', error)
    }
  }

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      toastError('Please enter a report name')
      return
    }

    if (selectedFields.length === 0) {
      toastError('Please select at least one metric')
      return
    }

    setSaving(true)
    try {
      // Build filters object, only including non-empty values
      const reportFilters: Record<string, string> = { ...filters }
      if (selectedSpaceId && selectedSpaceId !== 'all') {
        reportFilters.spaceId = selectedSpaceId
      }
      if (selectedUserId && selectedUserId !== 'all') {
        reportFilters.userId = selectedUserId
      }

      const result = await saveReport({
        name: reportName,
        description: `Report with ${selectedFields.length} metric${selectedFields.length !== 1 ? 's' : ''}`,
        type: 'report',
        dateRange,
        chartType,
        selectedFields,
        filters: reportFilters,
      })

      if (result.success) {
        toastSuccess('Report saved successfully')
        // Clear the form or navigate to saved reports
        router.push('/apps/analytics?tab=saved')
      } else {
        toastError(result.error || 'Failed to save report')
      }
    } catch (error) {
      toastError('Failed to save report')
    } finally {
      setSaving(false)
    }
  }

  const metrics = availableFields.filter(f => f.type === 'metric')
  const dimensions = availableFields.filter(f => f.type === 'dimension')

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Report Builder</h2>
            <p className="text-sm text-muted-foreground">Create custom analytics reports with drag & drop</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAIAgent(true)}
            className="gap-2 border-primary/20 hover:bg-primary/5"
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </Button>
          <Button 
            onClick={handleSaveReport}
            disabled={saving}
            className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Report
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Modern Report Builder Sidebar */}
        <Card className="lg:col-span-1 border-2 shadow-lg">
          <CardHeader className="border-b bg-card">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <GripVertical className="w-4 h-4 text-primary" />
              </div>
              Configuration
            </CardTitle>
            <CardDescription>Drag metrics to build your report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Report Name */}
            <div className="space-y-2">
              <Label htmlFor="report-name" className="text-sm font-semibold">Report Name</Label>
              <Input
                id="report-name"
                placeholder="My Custom Report"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="border-2 focus:border-primary"
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="date-range" className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last_7_days">Last 7 days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filters Section */}
            <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-dashed">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Filters</Label>
              </div>
              
              {/* Space Filter */}
              <div className="space-y-2">
                <Label htmlFor="space-filter" className="text-xs text-muted-foreground">Space</Label>
                <Select 
                  value={selectedSpaceId} 
                  onValueChange={setSelectedSpaceId}
                  disabled={loadingFilters}
                >
                  <SelectTrigger className="border-2 h-9">
                    <SelectValue placeholder="All Spaces" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Spaces</SelectItem>
                    {spaces.map(space => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Filter */}
              <div className="space-y-2">
                <Label htmlFor="user-filter" className="text-xs text-muted-foreground">User</Label>
                <Select 
                  value={selectedUserId} 
                  onValueChange={setSelectedUserId}
                  disabled={loadingFilters}
                >
                  <SelectTrigger className="border-2 h-9">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email || 'Unknown User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* X-Axis Label */}
            <div className="space-y-2">
              <Label htmlFor="x-axis-label">X-Axis Label (Optional)</Label>
              <Input
                id="x-axis-label"
                placeholder="e.g., Categories"
                value={xAxisLabel}
                onChange={(e) => setXAxisLabel(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Y-Axis Label */}
            <div className="space-y-2">
              <Label htmlFor="y-axis-label">Y-Axis Label (Optional)</Label>
              <Input
                id="y-axis-label"
                placeholder="e.g., Count"
                value={yAxisLabel}
                onChange={(e) => setYAxisLabel(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Chart Type */}
            <div className="space-y-2">
              <Label htmlFor="chart-type" className="text-sm font-semibold">Chart Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setChartType('bar')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    chartType === 'bar'
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <BarChart3 className={`w-5 h-5 mx-auto mb-1 ${chartType === 'bar' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${chartType === 'bar' ? 'text-primary' : 'text-muted-foreground'}`}>Bar</span>
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    chartType === 'line'
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <LineChart className={`w-5 h-5 mx-auto mb-1 ${chartType === 'line' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${chartType === 'line' ? 'text-primary' : 'text-muted-foreground'}`}>Line</span>
                </button>
                <button
                  onClick={() => setChartType('pie')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    chartType === 'pie'
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <PieChart className={`w-5 h-5 mx-auto mb-1 ${chartType === 'pie' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${chartType === 'pie' ? 'text-primary' : 'text-muted-foreground'}`}>Pie</span>
                </button>
                <button
                  onClick={() => setChartType('table')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    chartType === 'table'
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <Table className={`w-5 h-5 mx-auto mb-1 ${chartType === 'table' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${chartType === 'table' ? 'text-primary' : 'text-muted-foreground'}`}>Table</span>
                </button>
              </div>
            </div>

            {/* Drag and Drop Section */}
            <DragDropContext onDragEnd={handleDragEnd}>
              {/* Selected Fields - Drag to reorder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Selected Metrics</Label>
                  <Badge variant="secondary" className="text-xs">
                    {selectedFields.length}
                  </Badge>
                </div>
                <Droppable droppableId="selected-fields">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`min-h-[100px] max-h-64 overflow-y-auto rounded-lg border-2 border-dashed transition-colors ${
                        snapshot.isDraggingOver
                          ? 'border-primary bg-primary/5'
                          : 'border-muted bg-muted/30'
                      }`}
                    >
                      {selectedFields.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-sm">
                          <GripVertical className="w-5 h-5 mb-2 opacity-50" />
                          <span>Drag metrics here</span>
                        </div>
                      ) : (
                        <div className="p-2 space-y-2">
                          {selectedFields.map((fieldId, index) => {
                            const field = availableFields.find(f => f.id === fieldId)
                            if (!field) return null
                            const Icon = getFieldIcon(fieldId)
                            return (
                              <Draggable key={fieldId} draggableId={fieldId} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`group flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                                      snapshot.isDragging
                                        ? 'shadow-lg scale-105 bg-background'
                                        : 'bg-background hover:shadow-md'
                                    } ${getFieldColor()}`}
                                  >
                                    <div
                                      {...provided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-sm font-medium flex-1">{field.name}</span>
                                    <button
                                      onClick={() => handleFieldToggle(fieldId)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            )
                          })}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Available Fields - Drag to add */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Available Metrics</Label>
                  <Badge variant="outline" className="text-xs">
                    {metrics.length + dimensions.length}
                  </Badge>
                </div>
                <Droppable droppableId="available-fields">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`min-h-[200px] max-h-96 overflow-y-auto rounded-lg border transition-colors ${
                        snapshot.isDraggingOver
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-muted/20'
                      }`}
                    >
                      <div className="p-2 space-y-2">
                        {/* Metrics Section */}
                        {metrics.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wide">
                              Metrics
                            </div>
                            {metrics
                              .filter(field => !selectedFields.includes(field.id))
                              .map((field, index) => {
                                const Icon = getFieldIcon(field.id)
                                return (
                                  <Draggable key={field.id} draggableId={field.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`group flex items-center gap-2 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                                          snapshot.isDragging
                                            ? 'shadow-lg scale-105 bg-background'
                                            : 'bg-background'
                                        } ${getFieldColor()}`}
                                      >
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm font-medium flex-1">{field.name}</span>
                                        <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    )}
                                  </Draggable>
                                )
                              })}
                          </div>
                        )}
                        
                        {/* Dimensions Section */}
                        {dimensions.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wide">
                              Dimensions
                            </div>
                            {dimensions
                              .filter(field => !selectedFields.includes(field.id))
                              .map((field, index) => {
                                const Icon = getFieldIcon(field.id)
                                return (
                                  <Draggable key={field.id} draggableId={field.id} index={metrics.filter(f => !selectedFields.includes(f.id)).length + index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`group flex items-center gap-2 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                                          snapshot.isDragging
                                            ? 'shadow-lg scale-105 bg-background'
                                            : 'bg-background'
                                        } ${getFieldColor()}`}
                                      >
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm font-medium flex-1">{field.name}</span>
                                        <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    )}
                                  </Draggable>
                                )
                              })}
                          </div>
                        )}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </DragDropContext>

          </CardContent>
        </Card>

        {/* Modern Report Preview */}
        <Card className="lg:col-span-3 border-2 shadow-xl">
          <CardHeader className="pb-4 border-b bg-card">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  {reportName || 'Report Preview'}
                  {reportName && (
                    <Badge variant="secondary" className="ml-2">
                      {chartType}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {dateRange.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline" className="gap-1.5">
                    {selectedFields.length} metric{selectedFields.length !== 1 ? 's' : ''}
                  </Badge>
                  {selectedSpaceId && selectedSpaceId !== 'all' && (
                    <Badge variant="outline" className="gap-1.5">
                      <Filter className="w-3 h-3" />
                      {spaces.find(s => s.id === selectedSpaceId)?.name || 'Space'}
                    </Badge>
                  )}
                  {selectedUserId && selectedUserId !== 'all' && (
                    <Badge variant="outline" className="gap-1.5">
                      <Users className="w-3 h-3" />
                      {users.find(u => u.id === selectedUserId)?.full_name || users.find(u => u.id === selectedUserId)?.email || 'User'}
                    </Badge>
                  )}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {generating ? (
              <div className="h-96 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : reportData.length > 0 ? (
              <div className="space-y-4">
                {chartType === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 text-foreground font-semibold">Metric</th>
                          <th className="text-right p-2 text-foreground font-semibold">Value</th>
                          <th className="text-right p-2 text-foreground font-semibold">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((row, idx) => {
                          const displayName = reportLabels[idx] || row.metric
                          return (
                            <EditableTableRow
                              key={idx}
                              label={displayName}
                              value={row.value}
                              change={row.change}
                              onLabelChange={(newLabel) => {
                                setReportLabels(prev => ({ ...prev, [idx]: newLabel }))
                              }}
                            />
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-96 bg-card rounded-lg p-4">
                    {chartType === 'bar' && (
                      <AnalyticsBarChart 
                        data={reportData.map((row, idx) => ({ 
                          name: reportLabels[idx] || row.metric, 
                          value: row.value 
                        }))}
                        colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']}
                        xAxisLabel={xAxisLabel || undefined}
                        yAxisLabel={yAxisLabel || undefined}
                        onLabelChange={(index, newLabel) => {
                          setReportLabels(prev => ({ ...prev, [index]: newLabel }))
                        }}
                      />
                    )}
                    {chartType === 'line' && (
                      <AnalyticsLineChart 
                        data={reportData.map((row, idx) => ({ 
                          name: reportLabels[idx] || row.metric, 
                          value: row.value 
                        }))}
                        color="#10b981"
                        showArea={true}
                        xAxisLabel={xAxisLabel || undefined}
                        yAxisLabel={yAxisLabel || undefined}
                      />
                    )}
                    {chartType === 'pie' && (
                      <AnalyticsPieChart 
                        data={reportData.map((row, idx) => ({ 
                          name: reportLabels[idx] || row.metric, 
                          value: row.value 
                        }))}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-card/50">
                <div className="text-center">
                  {chartType === 'bar' && <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />}
                  {chartType === 'line' && <LineChart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />}
                  {chartType === 'pie' && <PieChart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />}
                  {chartType === 'table' && <Table className="w-16 h-16 mx-auto text-muted-foreground mb-4" />}
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedFields.length > 0 
                      ? 'Report updates automatically as you make changes'
                      : 'Drag metrics from the sidebar to start building your report'}
                  </p>
                  {selectedFields.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {selectedFields.map(fieldId => {
                        const field = availableFields.find(f => f.id === fieldId)
                        return field ? (
                          <span key={fieldId} className="px-2 py-1 bg-muted rounded text-xs">
                            {field.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Agent Dialog */}
      <Dialog open={showAIAgent} onOpenChange={setShowAIAgent}>
        <DialogContent className="max-w-2xl h-[80vh] p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle className="sr-only">AI Report Assistant</DialogTitle>
          </DialogHeader>
          <AIReportAgent
            onReportGenerated={(config) => {
              // Apply the AI-generated configuration
              setReportName(config.name)
              setDateRange(config.dateRange)
              setChartType(config.chartType)
              setSelectedFields(config.selectedFields)
              setXAxisLabel(config.xAxisLabel || '')
              setYAxisLabel(config.yAxisLabel || '')
              // Apply filters if provided
              if (config.filters) {
                setSelectedSpaceId(config.filters.spaceId || 'all')
                setSelectedUserId(config.filters.userId || 'all')
              }
              
              // Skip auto-generation since we'll trigger it manually
              skipAutoGenerate.current = true
              
              // Close the dialog after applying
              setShowAIAgent(false)
              toastSuccess('Report configuration applied!')
              
              // Generate the report automatically after state updates
              setTimeout(() => {
                handleGenerateReport()
              }, 200)
            }}
            onClose={() => setShowAIAgent(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

