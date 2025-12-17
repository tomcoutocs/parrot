"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  DollarSign,
  Calendar,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Mail,
  Phone,
  Building2
} from 'lucide-react'

export function CRMDashboard() {
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalDeals: 0,
    totalRevenue: 0,
    activeAccounts: 0,
    dealsWon: 0,
    dealsLost: 0,
    conversionRate: 0,
    avgDealSize: 0,
  })

  useEffect(() => {
    // TODO: Fetch real data from database
    // For now, using mock data
    setStats({
      totalContacts: 1247,
      totalDeals: 89,
      totalRevenue: 2450000,
      activeAccounts: 342,
      dealsWon: 23,
      dealsLost: 12,
      conversionRate: 65.7,
      avgDealSize: 106521,
    })
  }, [])

  const statCards: Array<{
    title: string
    value: string
    description: string
    trend: 'up' | 'down'
    icon: any
    color: string
  }> = [
    {
      title: 'Total Contacts',
      value: stats.totalContacts.toLocaleString(),
      description: '+12% from last month',
      trend: 'up' as const,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Active Deals',
      value: stats.totalDeals.toString(),
      description: '+8% from last month',
      trend: 'up' as const,
      icon: Briefcase,
      color: 'text-emerald-600',
    },
    {
      title: 'Total Revenue',
      value: `$${(stats.totalRevenue / 1000000).toFixed(2)}M`,
      description: '+23% from last month',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-amber-600',
    },
    {
      title: 'Active Accounts',
      value: stats.activeAccounts.toString(),
      description: '+5% from last month',
      trend: 'up' as const,
      icon: Building2,
      color: 'text-violet-600',
    },
    {
      title: 'Deals Won',
      value: stats.dealsWon.toString(),
      description: `${stats.conversionRate.toFixed(1)}% win rate`,
      trend: 'up' as const,
      icon: Target,
      color: 'text-green-600',
    },
    {
      title: 'Avg Deal Size',
      value: `$${(stats.avgDealSize / 1000).toFixed(0)}K`,
      description: '+3% from last month',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'text-rose-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New Contact
          </Button>
          <Button>
            <Briefcase className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-600 mr-1" />}
                  {stat.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-600 mr-1" />}
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Add New Contact
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Briefcase className="w-4 h-4 mr-2" />
              Create New Deal
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Building2 className="w-4 h-4 mr-2" />
              Add New Account
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Activity
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Phone className="w-4 h-4 mr-2" />
              Log Call
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New contact added</p>
                  <p className="text-xs text-muted-foreground">John Smith was added to the system</p>
                  <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Deal updated</p>
                  <p className="text-xs text-muted-foreground">Acme Corp deal moved to "Negotiation"</p>
                  <p className="text-xs text-muted-foreground mt-1">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Deal won</p>
                  <p className="text-xs text-muted-foreground">TechStart Inc deal closed for $125,000</p>
                  <p className="text-xs text-muted-foreground mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed'].map((stage, index) => (
              <div key={stage} className="text-center">
                <div className="text-2xl font-bold">{Math.floor(Math.random() * 20) + 5}</div>
                <div className="text-sm text-muted-foreground mt-1">{stage}</div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${Math.random() * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

