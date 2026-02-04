"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getLeadAnalytics } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { useTheme } from '@/components/providers/theme-provider'

export function LeadSourceChart({ dateRange }: { dateRange: { from: Date; to: Date } }) {
  const { data: session } = useSession()
  const { resolvedTheme } = useTheme()
  const [sourceData, setSourceData] = useState<Array<{ source: string; leads: number; conversions: number }>>([])
  const [loading, setLoading] = useState(true)
  
  // Get computed foreground color - use useMemo to ensure it updates with theme
  const foregroundColor = resolvedTheme === 'dark' ? 'oklch(0.8074 0.0142 93.0137)' : 'oklch(0.15 0 0)'

  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const result = await getLeadAnalytics(dateRange, session.user.company_id)

        if (result.success && result.analytics) {
          setSourceData(result.analytics.leadsBySource)
        }
      } catch (error) {
        console.error('Error loading lead source data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session?.user?.id, session?.user?.company_id, dateRange.from?.toISOString(), dateRange.to?.toISOString()])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
        <CardDescription>Performance by source</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            Loading chart data...
          </div>
        ) : sourceData.length === 0 ? (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            No data available for the selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350} key={resolvedTheme}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" opacity={0.2} />
              <XAxis 
                dataKey="source" 
                tick={{ fill: foregroundColor, fontSize: 12, fontWeight: 400 }}
                axisLine={{ stroke: 'oklch(var(--border))' }}
                tickLine={{ stroke: 'oklch(var(--border))' }}
              />
              <YAxis 
                tick={{ fill: foregroundColor, fontSize: 12, fontWeight: 400 }}
                axisLine={{ stroke: 'oklch(var(--border))' }}
                tickLine={{ stroke: 'oklch(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'oklch(var(--background))',
                  border: '1px solid oklch(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'oklch(var(--foreground))' }}
                itemStyle={{ color: 'oklch(var(--foreground))' }}
              />
              <Bar dataKey="leads" fill="#3b82f6" name="Leads" />
              <Bar dataKey="conversions" fill="#10b981" name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

