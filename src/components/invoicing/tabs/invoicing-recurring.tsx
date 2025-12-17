"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter,
  Repeat,
  Calendar,
  DollarSign,
  Pause,
  Play,
  MoreVertical,
  CheckCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RecurringInvoice {
  id: string
  name: string
  client: string
  amount: number
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  nextDate: string
  status: 'active' | 'paused' | 'cancelled'
  totalGenerated: number
}

export function InvoicingRecurring() {
  const [searchTerm, setSearchTerm] = useState('')
  const [recurring] = useState<RecurringInvoice[]>([
    {
      id: '1',
      name: 'Acme Corp - Monthly Subscription',
      client: 'Acme Corp',
      amount: 5000,
      frequency: 'monthly',
      nextDate: '2024-03-01',
      status: 'active',
      totalGenerated: 25000,
    },
    {
      id: '2',
      name: 'TechStart - Quarterly Retainer',
      client: 'TechStart Inc',
      amount: 15000,
      frequency: 'quarterly',
      nextDate: '2024-04-01',
      status: 'active',
      totalGenerated: 45000,
    },
    {
      id: '3',
      name: 'GlobalTech - Annual License',
      client: 'GlobalTech',
      amount: 50000,
      frequency: 'yearly',
      nextDate: '2025-01-01',
      status: 'paused',
      totalGenerated: 50000,
    },
  ])

  const filteredRecurring = recurring.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.client.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
    }
    return labels[freq] || freq
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'paused':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recurring Billing</h1>
          <p className="text-muted-foreground mt-1">
            Manage automated recurring invoices and subscriptions
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Recurring Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recurring.filter(r => r.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${recurring
                .filter(r => r.status === 'active' && r.frequency === 'monthly')
                .reduce((sum, r) => sum + r.amount, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${recurring.reduce((sum, r) => sum + r.totalGenerated, 0).toLocaleString()}
            </div>
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
                placeholder="Search recurring invoices..."
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

      {/* Recurring List */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring Invoices ({filteredRecurring.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRecurring.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                    <Repeat className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{item.name}</h3>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{item.client}</p>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">${item.amount.toLocaleString()}</span>
                        <span className="text-muted-foreground">/{getFrequencyLabel(item.frequency)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Next:</span>
                        <span className="font-medium">{item.nextDate}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Generated:</span>
                        <span className="font-medium">${item.totalGenerated.toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === 'active' ? (
                    <Button variant="outline" size="sm">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>View History</DropdownMenuItem>
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Cancel</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

