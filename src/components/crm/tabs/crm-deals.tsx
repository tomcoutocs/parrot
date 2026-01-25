"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
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
  Building2,
  Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { fetchLeads, fetchLeadStages, type Lead, type LeadStage } from '@/lib/database-functions'
import CreateLeadModal from '@/components/modals/create-lead-modal'

interface Deal {
  id: string
  name: string
  amount: number
  stage: string
  probability: number
  closeDate: string
  owner: string
  account?: string
  contacts: string[]
}

export function CRMDeals() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [deals, setDeals] = useState<Deal[]>([])
  const [stages, setStages] = useState<LeadStage[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    loadDeals()
  }, [session?.user?.company_id])

  const loadDeals = async () => {
    if (!session?.user?.company_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const spaceId = session.user.company_id

      // Fetch stages
      const stagesResult = await fetchLeadStages(spaceId)
      if (stagesResult.success && stagesResult.stages) {
        setStages(stagesResult.stages)
      }

      // Fetch leads that are in deal stages (not just "new")
      const result = await fetchLeads({ 
        spaceId,
        status: undefined // Get all statuses
      })

      if (result.success && result.leads) {
        // Filter out leads that are just "new" status and map to deals
        const mappedDeals: Deal[] = result.leads
          .filter((lead: Lead) => lead.status && lead.status !== 'new')
          .map((lead: Lead) => {
            const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
            const dealName = lead.company_id 
              ? `${fullName} - Deal`
              : `${fullName} - ${lead.job_title || 'Opportunity'}`
            
            // Get stage name from stage_id
            const stage = stagesResult.stages?.find(s => s.id === lead.stage_id)?.name || lead.status || 'Lead'
            
            // Calculate probability based on stage
            const probabilityMap: Record<string, number> = {
              'new': 10,
              'qualified': 30,
              'contacted': 40,
              'proposal': 50,
              'negotiation': 75,
              'closed_won': 100,
              'closed_lost': 0,
            }
            const probability = probabilityMap[lead.status?.toLowerCase() || 'new'] || 25

            // Use budget as amount, or default
            const amount = lead.budget || 0

            return {
              id: lead.id,
              name: dealName,
              amount,
              stage,
              probability,
              closeDate: lead.created_at ? new Date(lead.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              owner: session.user?.name || 'Unknown',
              account: undefined,
              contacts: [fullName],
            }
          })
        setDeals(mappedDeals)
      }
    } catch (error) {
      console.error('Error loading deals:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDeals = deals.filter(deal =>
    deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (deal.account && deal.account.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <div className="flex items-center justify-end">
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onLeadCreated={() => {
          setIsCreateModalOpen(false)
          loadDeals()
        }}
      />

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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No deals found</p>
            </div>
          ) : (
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
                      {deal.amount > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${deal.amount.toLocaleString()}
                        </span>
                      )}
                      {deal.account && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {deal.account}
                        </span>
                      )}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}

