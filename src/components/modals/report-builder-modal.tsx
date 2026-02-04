"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { fetchLeads, fetchLeadStages, fetchLeadActivities, type Lead, type LeadStage } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'

export interface ReportConfig {
  id?: string
  name: string
  dataSource: 'leads' | 'activities' | 'pipeline'
  metrics: string[]
  filters: {
    dateRange?: { from: Date; to: Date }
    stageIds?: string[]
    statuses?: string[]
    assignedTo?: string[]
    sources?: string[]
  }
  groupBy?: 'stage' | 'source' | 'status' | 'date' | 'assigned_to' | null
  chartType: 'bar' | 'line' | 'pie' | 'table'
  dateGrouping?: 'day' | 'week' | 'month' | 'quarter' | 'year'
}

interface ReportBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: ReportConfig) => void
  initialConfig?: ReportConfig
}

const AVAILABLE_METRICS = {
  leads: [
    { id: 'total_leads', label: 'Total Leads', type: 'count' },
    { id: 'total_revenue', label: 'Total Revenue', type: 'sum' },
    { id: 'avg_deal_size', label: 'Average Deal Size', type: 'avg' },
    { id: 'conversion_rate', label: 'Conversion Rate', type: 'percentage' },
    { id: 'win_rate', label: 'Win Rate', type: 'percentage' },
    { id: 'leads_by_stage', label: 'Leads by Stage', type: 'grouped' },
    { id: 'leads_by_source', label: 'Leads by Source', type: 'grouped' },
  ],
  activities: [
    { id: 'total_calls', label: 'Total Calls', type: 'count' },
    { id: 'total_emails', label: 'Total Emails', type: 'count' },
    { id: 'total_meetings', label: 'Total Meetings', type: 'count' },
    { id: 'calls_by_type', label: 'Calls by Type', type: 'grouped' },
    { id: 'activities_by_date', label: 'Activities by Date', type: 'grouped' },
  ],
  pipeline: [
    { id: 'pipeline_value', label: 'Pipeline Value', type: 'sum' },
    { id: 'stage_distribution', label: 'Stage Distribution', type: 'grouped' },
    { id: 'conversion_by_stage', label: 'Conversion by Stage', type: 'percentage' },
  ],
}

export function ReportBuilderModal({
  isOpen,
  onClose,
  onSave,
  initialConfig
}: ReportBuilderModalProps) {
  const { data: session } = useSession()
  const [config, setConfig] = useState<ReportConfig>({
    name: '',
    dataSource: 'leads',
    metrics: [],
    filters: {},
    chartType: 'bar',
    dateGrouping: 'month',
  })
  const [stages, setStages] = useState<LeadStage[]>([])
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig)
      if (initialConfig.filters.dateRange) {
        setDateFrom(initialConfig.filters.dateRange.from)
        setDateTo(initialConfig.filters.dateRange.to)
      }
    } else {
      // Set default date range to last 30 days
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 30)
      setDateFrom(from)
      setDateTo(to)
    }
  }, [initialConfig, isOpen])

  useEffect(() => {
    if (isOpen && session?.user?.company_id) {
      loadStages()
    }
  }, [isOpen, session?.user?.company_id])

  const loadStages = async () => {
    if (!session?.user?.company_id) return
    const result = await fetchLeadStages(session.user.company_id)
    if (result.success && result.stages) {
      setStages(result.stages)
    }
  }

  const handleSave = () => {
    if (!config.name.trim()) {
      return
    }

    const finalConfig: ReportConfig = {
      ...config,
      filters: {
        ...config.filters,
        dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
      },
    }

    onSave(finalConfig)
    onClose()
  }

  const toggleMetric = (metricId: string) => {
    setConfig(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter(m => m !== metricId)
        : [...prev.metrics, metricId],
    }))
  }

  const toggleStageFilter = (stageId: string) => {
    setConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        stageIds: prev.filters.stageIds?.includes(stageId)
          ? prev.filters.stageIds.filter(id => id !== stageId)
          : [...(prev.filters.stageIds || []), stageId],
      },
    }))
  }

  const availableMetrics = AVAILABLE_METRICS[config.dataSource] || []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Builder</DialogTitle>
          <DialogDescription>
            Create a custom report by selecting data sources, metrics, and visualization options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Report Name */}
          <div className="space-y-2">
            <Label htmlFor="reportName">Report Name *</Label>
            <Input
              id="reportName"
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Q4 Sales Performance"
            />
          </div>

          <Tabs defaultValue="data" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="data">Data Source</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
            </TabsList>

            {/* Data Source Tab */}
            <TabsContent value="data" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Data Source</Label>
                <Select
                  value={config.dataSource}
                  onValueChange={(value: 'leads' | 'activities' | 'pipeline') =>
                    setConfig(prev => ({ ...prev, dataSource: value, metrics: [] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">Leads & Contacts</SelectItem>
                    <SelectItem value="activities">Activities</SelectItem>
                    <SelectItem value="pipeline">Pipeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Group By (Optional)</Label>
                <Select
                  value={config.groupBy || 'none'}
                  onValueChange={(value) =>
                    setConfig(prev => ({ ...prev, groupBy: value === 'none' ? null : value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="stage">Stage</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="assigned_to">Assigned To</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.groupBy === 'date' && (
                <div className="space-y-2">
                  <Label>Date Grouping</Label>
                  <Select
                    value={config.dateGrouping || 'month'}
                    onValueChange={(value: 'day' | 'week' | 'month' | 'quarter' | 'year') =>
                      setConfig(prev => ({ ...prev, dateGrouping: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="quarter">Quarter</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="space-y-4 mt-4">
              <Label>Select Metrics to Include</Label>
              <div className="grid grid-cols-2 gap-3">
                {availableMetrics.map((metric) => (
                  <div key={metric.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                    <Checkbox
                      id={metric.id}
                      checked={config.metrics.includes(metric.id)}
                      onCheckedChange={() => toggleMetric(metric.id)}
                    />
                    <Label
                      htmlFor={metric.id}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {metric.label}
                    </Label>
                  </div>
                ))}
              </div>
              {config.metrics.length === 0 && (
                <p className="text-sm text-muted-foreground">Select at least one metric</p>
              )}
            </TabsContent>

            {/* Filters Tab */}
            <TabsContent value="filters" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date From</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Date To</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {config.dataSource === 'leads' || config.dataSource === 'pipeline' ? (
                  <div className="space-y-2">
                    <Label>Filter by Stages</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                      {stages.map((stage) => (
                        <div key={stage.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`stage-${stage.id}`}
                            checked={config.filters.stageIds?.includes(stage.id) || false}
                            onCheckedChange={() => toggleStageFilter(stage.id)}
                          />
                          <Label
                            htmlFor={`stage-${stage.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {stage.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label>Filter by Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'].map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={config.filters.statuses?.includes(status) || false}
                          onCheckedChange={() => {
                            setConfig(prev => ({
                              ...prev,
                              filters: {
                                ...prev.filters,
                                statuses: prev.filters.statuses?.includes(status)
                                  ? prev.filters.statuses.filter(s => s !== status)
                                  : [...(prev.filters.statuses || []), status],
                              },
                            }))
                          }}
                        />
                        <Label
                          htmlFor={`status-${status}`}
                          className="text-sm font-normal cursor-pointer capitalize"
                        >
                          {status.replace('_', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Visualization Tab */}
            <TabsContent value="visualization" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <Select
                  value={config.chartType}
                  onValueChange={(value: 'bar' | 'line' | 'pie' | 'table') =>
                    setConfig(prev => ({ ...prev, chartType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!config.name.trim() || config.metrics.length === 0}>
              {initialConfig ? 'Update Report' : 'Create Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
