"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpRight } from 'lucide-react'

const campaigns = [
  {
    id: '1',
    name: 'Q1 Product Launch',
    leads: 245,
    conversions: 68,
    conversionRate: 27.8,
    status: 'active',
  },
  {
    id: '2',
    name: 'LinkedIn Ad Campaign',
    leads: 189,
    conversions: 52,
    conversionRate: 27.5,
    status: 'active',
  },
  {
    id: '3',
    name: 'Email Newsletter',
    leads: 156,
    conversions: 38,
    conversionRate: 24.4,
    status: 'paused',
  },
]

export function CampaignPerformance({ dateRange }: { dateRange: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance</CardTitle>
        <CardDescription>Track your marketing campaigns</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{campaign.name}</h4>
                  <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                    {campaign.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{campaign.leads} leads</span>
                  <span>{campaign.conversions} conversions</span>
                  <span>{campaign.conversionRate}% rate</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

