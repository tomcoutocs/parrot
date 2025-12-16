"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const recentLeads = [
  {
    id: '1',
    name: 'John Smith',
    company: 'Acme Corp',
    email: 'john@acme.com',
    score: 85,
    status: 'Qualified',
    source: 'Website',
    date: '2 hours ago',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    company: 'TechStart Inc',
    email: 'sarah@techstart.com',
    score: 72,
    status: 'Contacted',
    source: 'LinkedIn',
    date: '5 hours ago',
  },
  {
    id: '3',
    name: 'Mike Davis',
    company: 'Global Solutions',
    email: 'mike@global.com',
    score: 91,
    status: 'Proposal',
    source: 'Referral',
    date: '1 day ago',
  },
]

export function RecentLeads() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Latest leads added to your pipeline</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentLeads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{lead.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{lead.name}</div>
                  <div className="text-sm text-muted-foreground">{lead.company}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={lead.score >= 80 ? 'default' : 'secondary'}>
                  Score: {lead.score}
                </Badge>
                <Badge variant="outline">{lead.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

