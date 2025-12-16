"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

const funnelStages = [
  { stage: 'Visitors', count: 10000, percentage: 100 },
  { stage: 'Leads', count: 500, percentage: 5 },
  { stage: 'Qualified', count: 150, percentage: 1.5 },
  { stage: 'Proposal', count: 75, percentage: 0.75 },
  { stage: 'Closed Won', count: 30, percentage: 0.3 },
]

export function ConversionFunnel({ dateRange }: { dateRange: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Track leads through each stage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {funnelStages.map((item, index) => {
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
        })}
      </CardContent>
    </Card>
  )
}

