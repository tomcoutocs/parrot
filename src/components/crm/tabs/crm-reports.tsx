"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Download,
  Plus,
  BarChart3,
  PieChart,
  LineChart,
  Loader2,
  Trash2,
  Edit
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchLeads, fetchLeadStages, fetchLeadActivities } from '@/lib/database-functions'
import { generateReport, generateActivityReport, type ReportData } from '@/lib/report-generator'
import { ReportConfig } from '@/components/modals/report-builder-modal'
import { ReportBuilderModal } from '@/components/modals/report-builder-modal'
import { AnalyticsBarChart } from '@/components/analytics/charts/bar-chart'
import { AnalyticsLineChart } from '@/components/analytics/charts/line-chart'
import { AnalyticsPieChart } from '@/components/analytics/charts/pie-chart'
import { Badge } from '@/components/ui/badge'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SavedReport extends ReportConfig {
  id: string
  createdAt: string
}

export function CRMReports() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalDeals: 0,
    winRate: 0,
    avgDealSize: 0,
    totalCalls: 0,
    totalEmails: 0,
    totalMeetings: 0,
  })
  const [stageData, setStageData] = useState<Array<{ name: string; count: number }>>([])
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [activeReport, setActiveReport] = useState<SavedReport | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null)

  useEffect(() => {
    loadReportData()
    loadSavedReports()
  }, [session?.user?.company_id])

  useEffect(() => {
    if (activeReport && session?.user?.company_id) {
      generateReportData(activeReport)
    }
  }, [activeReport, session?.user?.company_id])

  const loadReportData = async () => {
    if (!session?.user?.company_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const spaceId = session.user.company_id

      // Fetch leads
      const leadsResult = await fetchLeads({ spaceId })
      const leads = leadsResult.success ? leadsResult.leads || [] : []

      // Fetch stages
      const stagesResult = await fetchLeadStages(spaceId)
      const stages = stagesResult.success ? stagesResult.stages || [] : []

      // Fetch activities for counts
      let totalCalls = 0
      let totalEmails = 0
      let totalMeetings = 0

      for (const lead of leads.slice(0, 50)) { // Limit to avoid too many calls
        const activitiesResult = await fetchLeadActivities(lead.id)
        if (activitiesResult.success && activitiesResult.activities) {
          activitiesResult.activities.forEach(activity => {
            if (activity.activity_type === 'call_made' || activity.activity_type === 'call_received') {
              totalCalls++
            } else if (activity.activity_type === 'email_sent') {
              totalEmails++
            } else if (activity.activity_type === 'meeting_scheduled' || activity.activity_type === 'meeting_completed') {
              totalMeetings++
            }
          })
        }
      }

      // Calculate revenue
      const totalRevenue = leads
        .filter(l => l.status === 'closed_won' && l.budget)
        .reduce((sum, l) => sum + (l.budget || 0), 0)

      // Calculate deals
      const totalDeals = leads.filter(l => l.status && l.status !== 'new').length
      const dealsWon = leads.filter(l => l.status === 'closed_won').length
      const dealsLost = leads.filter(l => l.status === 'closed_lost').length
      const totalClosed = dealsWon + dealsLost
      const winRate = totalClosed > 0 ? (dealsWon / totalClosed) * 100 : 0

      // Calculate average deal size
      const wonDeals = leads.filter(l => l.status === 'closed_won' && l.budget)
      const avgDealSize = wonDeals.length > 0
        ? wonDeals.reduce((sum, l) => sum + (l.budget || 0), 0) / wonDeals.length
        : 0

      // Calculate stage distribution
      const stageCounts: Record<string, number> = {}
      leads.forEach(lead => {
        const stageName = stages.find(s => s.id === lead.stage_id)?.name || lead.status || 'New'
        stageCounts[stageName] = (stageCounts[stageName] || 0) + 1
      })
      const stageDataArray = Object.entries(stageCounts).map(([name, count]) => ({
        name,
        count,
      }))

      setStats({
        totalRevenue,
        totalDeals,
        winRate,
        avgDealSize,
        totalCalls,
        totalEmails,
        totalMeetings,
      })
      setStageData(stageDataArray)
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSavedReports = () => {
    try {
      const saved = localStorage.getItem('crm_saved_reports')
      if (saved) {
        setSavedReports(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading saved reports:', error)
    }
  }

  const saveReport = (config: ReportConfig) => {
    try {
      const newReport: SavedReport = {
        ...config,
        id: editingReport?.id || `report_${Date.now()}`,
        createdAt: editingReport?.createdAt || new Date().toISOString(),
      }

      let updatedReports: SavedReport[]
      if (editingReport) {
        updatedReports = savedReports.map(r => r.id === editingReport.id ? newReport : r)
      } else {
        updatedReports = [...savedReports, newReport]
      }

      setSavedReports(updatedReports)
      localStorage.setItem('crm_saved_reports', JSON.stringify(updatedReports))
      setActiveReport(newReport)
      setEditingReport(null)
      toastSuccess(editingReport ? 'Report updated successfully' : 'Report saved successfully')
    } catch (error) {
      toastError('Failed to save report')
    }
  }

  const deleteReport = (reportId: string) => {
    const updatedReports = savedReports.filter(r => r.id !== reportId)
    setSavedReports(updatedReports)
    localStorage.setItem('crm_saved_reports', JSON.stringify(updatedReports))
    if (activeReport?.id === reportId) {
      setActiveReport(null)
      setReportData(null)
    }
    toastSuccess('Report deleted successfully')
  }

  const generateReportData = async (report: SavedReport) => {
    if (!session?.user?.company_id) return

    try {
      setGeneratingReport(true)
      let result

      if (report.dataSource === 'activities') {
        result = await generateActivityReport(report, session.user.company_id)
      } else {
        result = await generateReport(report, session.user.company_id)
      }

      if (result.success && result.data) {
        setReportData(result.data)
      } else {
        toastError(result.error || 'Failed to generate report')
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to generate report')
    } finally {
      setGeneratingReport(false)
    }
  }

  const exportReport = () => {
    if (!reportData || !activeReport) return

    const csvRows: string[] = []
    csvRows.push('Name,Value')
    reportData.data.forEach(item => {
      csvRows.push(`${item.name},${item.value}`)
    })

    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeReport.name.replace(/\s+/g, '_')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toastSuccess('Report exported successfully')
  }

  const renderChart = () => {
    if (!reportData || reportData.data.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center border-2 border-dashed rounded-lg">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        </div>
      )
    }

    if (activeReport?.chartType === 'table') {
      return (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.data.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">
                    {typeof item.value === 'number' && item.value > 1000
                      ? item.value.toLocaleString()
                      : item.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    }

    const chartData = reportData.data.map(item => ({
      name: item.name,
      value: item.value,
    }))

    if (activeReport?.chartType === 'bar') {
      return <AnalyticsBarChart data={chartData} />
    } else if (activeReport?.chartType === 'line') {
      return <AnalyticsLineChart data={chartData} />
    } else if (activeReport?.chartType === 'pie') {
      return <AnalyticsPieChart data={chartData} />
    }

    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-sm text-muted-foreground">Create and manage custom reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            setEditingReport(null)
            setIsBuilderOpen(true)
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Report
          </Button>
          {activeReport && (
            <Button onClick={exportReport} disabled={!reportData}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Report Categories */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deals by Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stageData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                        <div className="text-center">
                          <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">No stage data available</p>
                        </div>
                      </div>
                    ) : (
                      <AnalyticsPieChart data={stageData.map(s => ({ name: s.name, value: s.count }))} />
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">
                          ${(stats.totalRevenue / 1000000).toFixed(2)}M
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Total Revenue</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{stats.totalDeals}</div>
                        <div className="text-sm text-muted-foreground mt-1">Total Deals</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground mt-1">Win Rate</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">
                          ${stats.avgDealSize > 0 ? (stats.avgDealSize / 1000).toFixed(0) + 'K' : '0'}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Avg Deal Size</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Activity Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{stats.totalCalls}</div>
                      <div className="text-sm text-muted-foreground mt-1">Total Calls</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{stats.totalEmails}</div>
                      <div className="text-sm text-muted-foreground mt-1">Emails Sent</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{stats.totalMeetings}</div>
                      <div className="text-sm text-muted-foreground mt-1">Meetings</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Custom Reports Tab */}
        <TabsContent value="custom" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Saved Reports List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Saved Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {savedReports.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-4">No saved reports</p>
                      <Button size="sm" onClick={() => setIsBuilderOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Report
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedReports.map((report) => (
                        <div
                          key={report.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            activeReport?.id === report.id
                              ? 'border-primary bg-muted'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setActiveReport(report)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{report.name}</h4>
                              <div className="flex gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {report.dataSource}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {report.chartType}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingReport(report)
                                  setIsBuilderOpen(true)
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteReport(report.id)
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Report Display */}
            <div className="lg:col-span-2">
              {activeReport ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{activeReport.name}</CardTitle>
                      <Badge variant="outline">{activeReport.chartType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {generatingReport ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    ) : (
                      <>
                        {renderChart()}
                        {reportData?.summary && (
                          <div className="mt-6 grid grid-cols-4 gap-4 pt-6 border-t">
                            <div>
                              <div className="text-sm text-muted-foreground">Total</div>
                              <div className="text-lg font-semibold">
                                {reportData.summary.total?.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Average</div>
                              <div className="text-lg font-semibold">
                                {reportData.summary.average?.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Min</div>
                              <div className="text-lg font-semibold">
                                {reportData.summary.min?.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Max</div>
                              <div className="text-lg font-semibold">
                                {reportData.summary.max?.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Select a Report</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose a saved report from the list or create a new one
                      </p>
                      <Button onClick={() => setIsBuilderOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Report Builder Modal */}
      <ReportBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false)
          setEditingReport(null)
        }}
        onSave={saveReport}
        initialConfig={editingReport || undefined}
      />
    </div>
  )
}
