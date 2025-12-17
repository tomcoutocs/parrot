"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter,
  DollarSign,
  Calendar,
  User,
  Building2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Deal {
  id: string
  name: string
  amount: number
  stage: string
  probability: number
  closeDate: string
  owner: string
  account: string
  contacts: string[]
}

const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

export function CRMDeals() {
  const [searchTerm, setSearchTerm] = useState('')
  const [deals] = useState<Deal[]>([
    {
      id: '1',
      name: 'Acme Corp - Enterprise License',
      amount: 125000,
      stage: 'Negotiation',
      probability: 75,
      closeDate: '2024-02-15',
      owner: 'John Doe',
      account: 'Acme Corp',
      contacts: ['John Smith'],
    },
    {
      id: '2',
      name: 'TechStart - Annual Subscription',
      amount: 45000,
      stage: 'Proposal',
      probability: 50,
      closeDate: '2024-02-20',
      owner: 'Jane Smith',
      account: 'TechStart Inc',
      contacts: ['Sarah Johnson'],
    },
    {
      id: '3',
      name: 'GlobalTech - Implementation',
      amount: 89000,
      stage: 'Qualified',
      probability: 30,
      closeDate: '2024-03-01',
      owner: 'John Doe',
      account: 'GlobalTech',
      contacts: ['Michael Chen'],
    },
  ])

  const filteredDeals = deals.filter(deal =>
    deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.account.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Lead': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      'Qualified': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'Proposal': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      'Negotiation': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'Closed Won': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Closed Lost': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[stage] || colors['Lead']
  }

  const totalValue = deals.reduce((sum, deal) => sum + deal.amount, 0)
  const weightedValue = deals.reduce((sum, deal) => sum + (deal.amount * deal.probability / 100), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground mt-1">
            Manage your sales pipeline and opportunities
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalValue / 1000).toFixed(0)}K</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Weighted Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(weightedValue / 1000).toFixed(0)}K</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deals.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deals List */}
      <Card>
        <CardHeader>
          <CardTitle>All Deals ({filteredDeals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{deal.name}</h3>
                    <Badge className={getStageColor(deal.stage)}>
                      {deal.stage}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${deal.amount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {deal.account}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {deal.owner}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {deal.closeDate}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Probability</span>
                      <span className="font-medium">{deal.probability}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

