"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { getLeadAnalytics, getLeadStatistics } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'

export function PerformanceMetrics({ dateRange }: { dateRange: { from: Date; to: Date } }) {
  const { data: session } = useSession()
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    conversionRate: 0,
    averageScore: 0,
    costPerLead: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMetrics = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      
      try {
        // Get analytics for date range
        const analyticsResult = await getLeadAnalytics(dateRange, session.user.company_id)
        
        // Get overall stats for comparison
        const statsResult = await getLeadStatistics(session.user.company_id)

        if (analyticsResult.success && analyticsResult.analytics) {
          setMetrics({
            totalLeads: analyticsResult.analytics.totalLeads,
            conversionRate: analyticsResult.analytics.conversionRate,
            averageScore: analyticsResult.analytics.averageScore,
            costPerLead: 0, // Would need campaign data to calculate
          })
        }
      } catch (error) {
        console.error('Error loading performance metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [session?.user?.id, session?.user?.company_id, dateRange.from?.toISOString(), dateRange.to?.toISOString()])

  const metricsData = [
    {
      title: 'Total Leads',
      value: metrics.totalLeads.toLocaleString(),
      change: '+0%',
      trend: 'up' as const,
      description: 'in selected period',
    },
    {
      title: 'Conversion Rate',
      value: `${metrics.conversionRate.toFixed(1)}%`,
      change: '+0%',
      trend: 'up' as const,
      description: 'in selected period',
    },
    {
      title: 'Average Score',
      value: metrics.averageScore.toString(),
      change: '+0',
      trend: 'up' as const,
      description: 'in selected period',
    },
    {
      title: 'Cost per Lead',
      value: metrics.costPerLead > 0 ? `$${metrics.costPerLead.toFixed(2)}` : 'N/A',
      change: '-0%',
      trend: 'down' as const,
      description: 'in selected period',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricsData.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : metric.value}
            </div>
            {!loading && (
              <div className={`flex items-center text-xs mt-1 ${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.trend === 'up' ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {metric.change} {metric.description}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

