"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

const metrics = [
  {
    title: 'Total Leads',
    value: '1,247',
    change: '+12.5%',
    trend: 'up',
    description: 'vs last period',
  },
  {
    title: 'Conversion Rate',
    value: '27.4%',
    change: '+3.2%',
    trend: 'up',
    description: 'vs last period',
  },
  {
    title: 'Average Score',
    value: '72',
    change: '+5',
    trend: 'up',
    description: 'vs last period',
  },
  {
    title: 'Cost per Lead',
    value: '$24.50',
    change: '-8.3%',
    trend: 'down',
    description: 'vs last period',
  },
]

export function PerformanceMetrics({ dateRange }: { dateRange: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
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
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

