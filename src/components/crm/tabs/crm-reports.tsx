"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Download,
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  Loader2
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchLeads, fetchLeadStages, type Lead, type LeadStage } from '@/lib/database-functions'

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

  useEffect(() => {
    loadReportData()
  }, [session?.user?.company_id])

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

      // Calculate activity counts (placeholder - would need actual activity data)
      const totalCalls = 0
      const totalEmails = 0
      const totalMeetings = 0

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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Customize Report
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

      {/* Report Categories */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList>
          <TabsTrigger value="sales">Sales Performance</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Analysis</TabsTrigger>
          <TabsTrigger value="activities">Activity Reports</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                      <div className="text-center">
                        <LineChart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Revenue chart will be displayed here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                      <div className="h-64 flex items-center justify-center">
                        <div className="space-y-2 w-full">
                          {stageData.map((stage) => (
                            <div key={stage.name} className="flex items-center justify-between">
                              <span className="text-sm">{stage.name}</span>
                              <span className="font-medium">{stage.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Sales Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            </>
          )}
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Pipeline funnel chart will be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Stage Conversion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Lead → Qualified', 'Qualified → Proposal', 'Proposal → Negotiation', 'Negotiation → Closed'].map((stage, index) => (
                  <div key={stage}>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{stage}</span>
                      <span className="font-medium">{Math.floor(Math.random() * 30) + 50}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${Math.floor(Math.random() * 30) + 50}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6 mt-6">
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
        </TabsContent>

        <TabsContent value="custom" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Custom Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Build Your Custom Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select metrics, filters, and date ranges to create a personalized report
                </p>
                <Button>Create Report</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

