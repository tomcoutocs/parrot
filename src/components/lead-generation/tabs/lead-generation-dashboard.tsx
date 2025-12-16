"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Users, Target, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { LeadGenerationPipeline } from '../components/lead-pipeline-preview'
import { RecentLeads } from '../components/recent-leads'
import { QuickActions } from '../components/quick-actions'

export function LeadGenerationDashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    activeCampaigns: 0,
    leadsThisMonth: 0,
    leadsLastMonth: 0,
  })

  useEffect(() => {
    // TODO: Fetch actual stats from API
    setStats({
      totalLeads: 1247,
      qualifiedLeads: 342,
      conversionRate: 27.4,
      activeCampaigns: 8,
      leadsThisMonth: 156,
      leadsLastMonth: 142,
    })
  }, [])

  const leadsGrowth = stats.leadsLastMonth > 0 
    ? ((stats.leadsThisMonth - stats.leadsLastMonth) / stats.leadsLastMonth * 100).toFixed(1)
    : '0'

  const statCards = [
    {
      title: 'Total Leads',
      value: stats.totalLeads.toLocaleString(),
      description: `${leadsGrowth}% from last month`,
      icon: Users,
      trend: parseFloat(leadsGrowth) > 0 ? 'up' : 'down',
      color: 'text-blue-600',
    },
    {
      title: 'Qualified Leads',
      value: stats.qualifiedLeads.toLocaleString(),
      description: `${((stats.qualifiedLeads / stats.totalLeads) * 100).toFixed(1)}% qualification rate`,
      icon: Target,
      trend: 'up',
      color: 'text-green-600',
    },
    {
      title: 'Conversion Rate',
      value: `${stats.conversionRate}%`,
      description: 'Average conversion rate',
      icon: TrendingUp,
      trend: 'up',
      color: 'text-purple-600',
    },
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns.toString(),
      description: 'Currently running',
      icon: Zap,
      trend: 'neutral',
      color: 'text-muted-foreground',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your lead generation performance
          </p>
        </div>
        <Button variant="outline">
          <Target className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Quick Actions */}
      <QuickActions />

      {/* Pipeline Preview & Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadGenerationPipeline />
        <RecentLeads />
      </div>
    </div>
  )
}

