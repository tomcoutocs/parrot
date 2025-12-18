"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getLeadAnalytics, fetchLeads } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'

export function ConversionFunnel({ dateRange }: { dateRange: { from: Date; to: Date } }) {
  const { data: session } = useSession()
  const [funnelStages, setFunnelStages] = useState<Array<{ stage: string; count: number; percentage: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      
      try {
        // Get all leads for total count
        const leadsResult = await fetchLeads({
          spaceId: session.user.company_id,
        })

        // Get analytics for stage breakdown
        const analyticsResult = await getLeadAnalytics(dateRange, session.user.company_id)

        if (leadsResult.success && leadsResult.leads && analyticsResult.success && analyticsResult.analytics) {
          const totalLeads = leadsResult.leads.length
          const maxCount = Math.max(...analyticsResult.analytics.leadsByStage.map(s => s.count), totalLeads)

          const stages = [
            { stage: 'Total Leads', count: totalLeads, percentage: 100 },
            ...analyticsResult.analytics.leadsByStage.map(s => ({
              stage: s.stage,
              count: s.count,
              percentage: maxCount > 0 ? (s.count / maxCount) * 100 : 0,
            })),
          ]

          setFunnelStages(stages)
        }
      } catch (error) {
        console.error('Error loading conversion funnel data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session?.user?.id, session?.user?.company_id, dateRange.from?.toISOString(), dateRange.to?.toISOString()])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Track leads through each stage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading funnel data...</div>
        ) : funnelStages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No data available</div>
        ) : (
          funnelStages.map((item, index) => {
            const previousCount = index > 0 ? funnelStages[index - 1].count : item.count
            const conversionRate = previousCount > 0 ? (item.count / previousCount) * 100 : 0
            
            return (
              <div key={item.stage} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{item.count.toLocaleString()}</span>
                    {index > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({conversionRate.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

