"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Save,
  Download,
  Filter,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  TrendingUp
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ReportField {
  id: string
  name: string
  type: 'metric' | 'dimension'
  selected: boolean
}

const availableFields: ReportField[] = [
  { id: 'users', name: 'Users', type: 'metric', selected: false },
  { id: 'sessions', name: 'Sessions', type: 'metric', selected: false },
  { id: 'pageviews', name: 'Page Views', type: 'metric', selected: false },
  { id: 'duration', name: 'Session Duration', type: 'metric', selected: false },
  { id: 'bounce_rate', name: 'Bounce Rate', type: 'metric', selected: false },
  { id: 'conversions', name: 'Conversions', type: 'metric', selected: false },
  { id: 'revenue', name: 'Revenue', type: 'metric', selected: false },
  { id: 'date', name: 'Date', type: 'dimension', selected: false },
  { id: 'source', name: 'Traffic Source', type: 'dimension', selected: false },
  { id: 'device', name: 'Device Type', type: 'dimension', selected: false },
  { id: 'location', name: 'Location', type: 'dimension', selected: false },
  { id: 'page', name: 'Page', type: 'dimension', selected: false },
]

export function AnalyticsReports() {
  const [reportName, setReportName] = useState('')
  const [dateRange, setDateRange] = useState('last_30_days')
  const [chartType, setChartType] = useState('bar')
  const [selectedFields, setSelectedFields] = useState<string[]>(['users', 'sessions', 'date'])
  const [filters, setFilters] = useState<Record<string, string>>({})

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    )
  }

  const handleGenerateReport = () => {
    // TODO: Generate report based on selections
    console.log('Generating report:', {
      reportName,
      dateRange,
      chartType,
      selectedFields,
      filters
    })
  }

  const handleSaveReport = () => {
    // TODO: Save report
    console.log('Saving report')
  }

  const metrics = availableFields.filter(f => f.type === 'metric')
  const dimensions = availableFields.filter(f => f.type === 'dimension')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleSaveReport}>
            <Save className="w-4 h-4 mr-2" />
            Save Report
          </Button>
          <Button onClick={handleGenerateReport}>
            Generate Report
          </Button>
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
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{reportName || 'Report Preview'}</CardTitle>
                <CardDescription>
                  {dateRange.replace('_', ' ')} • {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96 flex items-center justify-center border-2 border-dashed rounded-lg">
              <div className="text-center">
                {chartType === 'bar' && <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />}
                {chartType === 'line' && <LineChart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />}
                {chartType === 'pie' && <PieChart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />}
                {chartType === 'table' && <Table className="w-16 h-16 mx-auto text-muted-foreground mb-4" />}
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedFields.length > 0 
                    ? `Report will display ${chartType} chart with selected fields`
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

