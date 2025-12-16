"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { ConversionFunnel } from '../components/conversion-funnel'
import { LeadSourceChart } from '../components/lead-source-chart'
import { PerformanceMetrics } from '../components/performance-metrics'
import { CampaignPerformance } from '../components/campaign-performance'

export function LeadAnalytics() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track performance and optimize your lead generation
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <PerformanceMetrics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <LeadSourceChart dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <CampaignPerformance dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <ConversionFunnel dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

