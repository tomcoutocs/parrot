"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Download,
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function CRMReports() {
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
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Pie chart will be displayed here</p>
                  </div>
                </div>
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
                  <div className="text-2xl font-bold">$2.45M</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Revenue</div>
                  <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-2">
                    <TrendingUp className="w-3 h-3" />
                    +23% from last month
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">89</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Deals</div>
                  <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-2">
                    <TrendingUp className="w-3 h-3" />
                    +8% from last month
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">65.7%</div>
                  <div className="text-sm text-muted-foreground mt-1">Win Rate</div>
                  <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-2">
                    <TrendingUp className="w-3 h-3" />
                    +5% from last month
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">$106K</div>
                  <div className="text-sm text-muted-foreground mt-1">Avg Deal Size</div>
                  <div className="flex items-center justify-center gap-1 text-xs text-green-600 mt-2">
                    <TrendingUp className="w-3 h-3" />
                    +3% from last month
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                  <div className="text-2xl font-bold">156</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Calls</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">89</div>
                  <div className="text-sm text-muted-foreground mt-1">Emails Sent</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">34</div>
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

