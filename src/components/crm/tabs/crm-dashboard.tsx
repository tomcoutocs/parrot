"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
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
  Building2,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import CreateLeadModal from '@/components/modals/create-lead-modal'
import { CreateSpaceModal } from '@/components/modals/create-space-modal'
import CreateActivityModal from '@/components/modals/create-activity-modal'

export function CRMDashboard() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
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
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string
    type: string
    title: string
    description: string
    time: string
  }>>([])
  const [pipelineStages, setPipelineStages] = useState<Array<{
    name: string
    count: number
    percentage: number
  }>>([])
  const [isCreateContactModalOpen, setIsCreateContactModalOpen] = useState(false)
  const [isCreateDealModalOpen, setIsCreateDealModalOpen] = useState(false)
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false)
  const [isCreateActivityModalOpen, setIsCreateActivityModalOpen] = useState(false)

  useEffect(() => {
    loadCRMData()
  }, [session?.user?.company_id])

  const loadCRMData = async () => {
    if (!session?.user?.company_id || !supabase) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const spaceId = session.user.company_id

      // Fetch leads (contacts)
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('space_id', spaceId)

      if (leadsError) {
        console.error('Error fetching leads:', leadsError)
      }

      // Fetch companies (accounts)
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_active', true)

      if (companiesError) {
        console.error('Error fetching companies:', companiesError)
      }

      // Fetch lead stages for pipeline
      const { data: leadStages } = await supabase
        .from('lead_stages')
        .select('*')
        .eq('space_id', spaceId)
        .order('stage_order', { ascending: true })

      // Calculate stats from leads
      const totalContacts = leads?.length || 0
      const totalDeals = leads?.filter(l => l.status && l.status !== 'new').length || 0
      const dealsWon = leads?.filter(l => l.status === 'closed_won').length || 0
      const dealsLost = leads?.filter(l => l.status === 'closed_lost').length || 0
      const totalDealsCount = dealsWon + dealsLost + (leads?.filter(l => 
        ['qualified', 'proposal', 'negotiation'].includes(l.status)
      ).length || 0)
      
      // Calculate revenue from leads with budget
      const totalRevenue = leads?.reduce((sum, lead) => {
        if (lead.status === 'closed_won' && lead.budget) {
          return sum + parseFloat(lead.budget.toString())
        }
        return sum
      }, 0) || 0

      // Calculate average deal size
      const wonDealsWithBudget = leads?.filter(l => l.status === 'closed_won' && l.budget) || []
      const avgDealSize = wonDealsWithBudget.length > 0
        ? wonDealsWithBudget.reduce((sum, l) => sum + parseFloat(l.budget.toString()), 0) / wonDealsWithBudget.length
        : 0

      // Calculate conversion rate
      const conversionRate = totalDealsCount > 0 
        ? (dealsWon / totalDealsCount) * 100 
        : 0

      const activeAccounts = companies?.length || 0

      // Store pipeline data for later use
      const pipelineData = {
        stages: leadStages || [],
        leads: leads || [],
      }

      setStats({
        totalContacts,
        totalDeals: totalDealsCount,
        totalRevenue,
        activeAccounts,
        dealsWon,
        dealsLost,
        conversionRate,
        avgDealSize,
      })

      // Fetch recent activities
      const recentLeads = leads?.slice(0, 5) || []
      const activities = recentLeads.map(lead => {
        const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
        const timeAgo = lead.created_at 
          ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })
          : 'Recently'
        
        return {
          id: lead.id,
          type: lead.status === 'closed_won' ? 'deal_won' : lead.status === 'closed_lost' ? 'deal_lost' : 'contact_added',
          title: lead.status === 'closed_won' 
            ? 'Deal won' 
            : lead.status === 'closed_lost'
            ? 'Deal lost'
            : 'New contact added',
          description: lead.status === 'closed_won'
            ? `${fullName} deal closed${lead.budget ? ` for $${lead.budget.toLocaleString()}` : ''}`
            : lead.status === 'closed_lost'
            ? `${fullName} deal was lost`
            : `${fullName} was added to the system`,
          time: timeAgo,
        }
      })
      setRecentActivities(activities)

      // Calculate pipeline stages
      const stageCounts: Record<string, number> = {}
      leads?.forEach(lead => {
        const stageName = leadStages?.find(s => s.id === lead.stage_id)?.name || lead.status || 'New'
        stageCounts[stageName] = (stageCounts[stageName] || 0) + 1
      })
      
      const totalPipelineLeads = Object.values(stageCounts).reduce((sum, count) => sum + count, 0)
      const pipeline = Object.entries(stageCounts).map(([name, count]) => ({
        name,
        count,
        percentage: totalPipelineLeads > 0 ? (count / totalPipelineLeads) * 100 : 0,
      }))
      setPipelineStages(pipeline)
    } catch (error) {
      console.error('Error loading CRM data:', error)
    } finally {
      setLoading(false)
    }
  }

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
          <Button variant="outline" onClick={() => setIsCreateContactModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Contact
          </Button>
          <Button onClick={() => setIsCreateDealModalOpen(true)}>
            <Briefcase className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>

      {/* Create Modals */}
      <CreateLeadModal
        isOpen={isCreateContactModalOpen}
        onClose={() => setIsCreateContactModalOpen(false)}
        onLeadCreated={() => {
          setIsCreateContactModalOpen(false)
          loadCRMData()
        }}
      />
      <CreateLeadModal
        isOpen={isCreateDealModalOpen}
        onClose={() => setIsCreateDealModalOpen(false)}
        onLeadCreated={() => {
          setIsCreateDealModalOpen(false)
          loadCRMData()
        }}
      />
      <CreateSpaceModal
        isOpen={isCreateAccountModalOpen}
        onClose={() => setIsCreateAccountModalOpen(false)}
        onSuccess={() => {
          setIsCreateAccountModalOpen(false)
          loadCRMData()
        }}
      />
      <CreateActivityModal
        isOpen={isCreateActivityModalOpen}
        onClose={() => setIsCreateActivityModalOpen(false)}
        onActivityCreated={() => {
          setIsCreateActivityModalOpen(false)
          loadCRMData()
        }}
      />

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
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
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => setIsCreateContactModalOpen(true)}>
              <Users className="w-4 h-4 mr-2" />
              Add New Contact
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setIsCreateDealModalOpen(true)}>
              <Briefcase className="w-4 h-4 mr-2" />
              Create New Deal
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setIsCreateAccountModalOpen(true)}>
              <Building2 className="w-4 h-4 mr-2" />
              Add New Account
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setIsCreateActivityModalOpen(true)}>
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
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const getIcon = () => {
                    switch (activity.type) {
                      case 'deal_won':
                        return <DollarSign className="w-4 h-4 text-amber-600" />
                      case 'deal_lost':
                        return <Briefcase className="w-4 h-4 text-red-600" />
                      default:
                        return <Users className="w-4 h-4 text-blue-600" />
                    }
                  }
                  const getBgColor = () => {
                    switch (activity.type) {
                      case 'deal_won':
                        return 'bg-amber-100 dark:bg-amber-900/30'
                      case 'deal_lost':
                        return 'bg-red-100 dark:bg-red-900/30'
                      default:
                        return 'bg-blue-100 dark:bg-blue-900/30'
                    }
                  }
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getBgColor()}`}>
                        {getIcon()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {pipelineStages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No pipeline data available
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {pipelineStages.slice(0, 5).map((stage) => (
                <div key={stage.name} className="text-center">
                  <div className="text-2xl font-bold">{stage.count}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stage.name}</div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

