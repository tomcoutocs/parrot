"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const stages = [
  { name: 'New', count: 45, color: 'bg-blue-500' },
  { name: 'Contacted', count: 32, color: 'bg-yellow-500' },
  { name: 'Qualified', count: 28, color: 'bg-purple-500' },
  { name: 'Proposal', count: 15, color: 'bg-gray-500' },
  { name: 'Closed Won', count: 12, color: 'bg-green-500' },
]

export function LeadGenerationPipeline() {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Overview</CardTitle>
        <CardDescription>Leads by stage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage) => {
          const percentage = total > 0 ? (stage.count / total) * 100 : 0
          return (
            <div key={stage.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <span className="text-sm font-medium">{stage.name}</span>
                </div>
                <Badge variant="secondary">{stage.count}</Badge>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

