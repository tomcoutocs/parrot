"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
  Sparkles
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

interface ReportField {
  id: string
  name: string
  type: 'metric' | 'dimension'
  selected: boolean
}

const availableFields: ReportField[] = [
  { id: 'users', name: 'Users', type: 'metric', selected: false },
  { id: 'projects', name: 'Projects', type: 'metric', selected: false },
  { id: 'tasks', name: 'Tasks', type: 'metric', selected: false },
  { id: 'submissions', name: 'Form Submissions', type: 'metric', selected: false },
  { id: 'activities', name: 'Activities', type: 'metric', selected: false },
  { id: 'date', name: 'Date', type: 'dimension', selected: false },
  { id: 'status', name: 'Status', type: 'dimension', selected: false },
  { id: 'role', name: 'User Role', type: 'dimension', selected: false },
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

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    )
  }

  const [reportData, setReportData] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)

  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      // Generate report based on selections
      const analyticsData = await getAnalyticsStats()
      
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
      
      setReportData(data)
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setGenerating(false)
    }
  }

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
      const reports = await getSavedReports()
      const report = reports.find(r => r.id === reportId)
      if (report) {
        setReportName(report.name)
        setDateRange(report.dateRange)
        setChartType(report.chartType)
        setSelectedFields(report.selectedFields)
        setFilters(report.filters || {})
        // Generate the report automatically
        handleGenerateReport()
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
      const result = await saveReport({
        name: reportName,
        description: `Report with ${selectedFields.length} metric${selectedFields.length !== 1 ? 's' : ''}`,
        type: 'report',
        dateRange,
        chartType,
        selectedFields,
        filters,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowAIAgent(true)}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          AI Assistant
        </Button>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleSaveReport}
            disabled={saving || !reportName.trim() || selectedFields.length === 0}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Report
              </>
            )}
          </Button>
          <Button onClick={handleGenerateReport} disabled={generating || selectedFields.length === 0}>
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Builder Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Report Builder</CardTitle>
            <CardDescription>Configure your report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Name */}
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                placeholder="My Custom Report"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="date-range">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
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
              <Label htmlFor="chart-type">Chart Type</Label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Bar Chart</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChart className="w-4 h-4" />
                      <span>Line Chart</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-4 h-4" />
                      <span>Pie Chart</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="table">
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4" />
                      <span>Table</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              <Label>Metrics</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {metrics.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => handleFieldToggle(field.id)}
                    />
                    <Label
                      htmlFor={field.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {field.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-2">
              <Label>Dimensions</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dimensions.map((field) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => handleFieldToggle(field.id)}
                    />
                    <Label
                      htmlFor={field.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {field.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <Label>Filters</Label>
              <Button variant="outline" size="sm" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Add Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <Card className="lg:col-span-3 border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">{reportName || 'Report Preview'}</CardTitle>
                <CardDescription className="mt-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {dateRange.replace('_', ' ')}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected</span>
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="shadow-sm">
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
                      ? `Click "Generate Report" to view data`
                      : 'Select metrics and dimensions to generate report'}
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
              
              // Generate the report automatically
              setTimeout(() => {
                handleGenerateReport()
              }, 100)
              
              // Close the dialog after applying
              setShowAIAgent(false)
              toastSuccess('Report configuration applied!')
            }}
            onClose={() => setShowAIAgent(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

