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
  Building2,
  Users,
  DollarSign,
  Briefcase,
  MapPin,
  Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'
import { fetchSpaces, fetchLeads, type Lead } from '@/lib/database-functions'
import type { Space } from '@/lib/supabase'
import { CreateSpaceModal } from '@/components/modals/create-space-modal'

interface Account {
  id: string
  name: string
  industry?: string
  employees?: number
  annualRevenue?: number
  location?: string
  status: 'active' | 'inactive' | 'prospect'
  contacts: number
  deals: number
  totalDealValue: number
}

export function CRMAccounts() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [session?.user?.company_id])

  const loadAccounts = async () => {
    if (!session?.user?.company_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const spaceId = session.user.company_id

      // Fetch spaces (accounts)
      const spaces = await fetchSpaces()
      
      // Fetch leads to calculate stats per account
      const leadsResult = await fetchLeads({ spaceId })
      const leads = leadsResult.success ? leadsResult.leads || [] : []

      // Group leads by company_id to calculate stats
      const leadsByCompany: Record<string, Lead[]> = {}
      leads.forEach(lead => {
        const companyId = lead.company_id || 'unknown'
        if (!leadsByCompany[companyId]) {
          leadsByCompany[companyId] = []
        }
        leadsByCompany[companyId].push(lead)
      })

      // Map spaces to accounts with stats
      const mappedAccounts: Account[] = spaces
        .filter(space => space.is_active)
        .map((space: Space) => {
          const spaceLeads = leadsByCompany[space.id] || []
          const activeDeals = spaceLeads.filter(l => l.status && l.status !== 'new' && l.status !== 'closed_lost')
          const totalDealValue = spaceLeads
            .filter(l => l.budget)
            .reduce((sum, l) => sum + (l.budget || 0), 0)

          return {
            id: space.id,
            name: space.name,
            industry: undefined,
            employees: undefined,
            annualRevenue: undefined,
            location: undefined,
            status: space.is_active ? 'active' : 'inactive',
            contacts: spaceLeads.length,
            deals: activeDeals.length,
            totalDealValue,
          }
        })

      setAccounts(mappedAccounts)
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (account.industry && account.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (account.location && account.location.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'prospect':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Account
        </Button>
      </div>

      {/* Create Space Modal */}
      <CreateSpaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          loadAccounts()
        }}
      />

      {/* Account Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.filter(a => a.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.reduce((sum, acc) => sum + acc.contacts, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(accounts.reduce((sum, acc) => sum + acc.totalDealValue, 0) / 1000).toFixed(0)}K
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
                placeholder="Search accounts..."
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

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Accounts ({filteredAccounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No accounts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Building2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-lg">{account.name}</h3>
                        <Badge className={getStatusColor(account.status)}>
                          {account.status}
                        </Badge>
                      </div>
                      {(account.industry || account.employees || account.location) && (
                        <div className="flex items-center gap-6 text-sm text-muted-foreground mb-2">
                          {account.industry && <span>{account.industry}</span>}
                          {account.employees && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {account.employees} employees
                            </span>
                          )}
                          {account.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {account.location}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-6 text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          {account.contacts} contacts
                        </span>
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-muted-foreground" />
                          {account.deals} deals
                        </span>
                        {account.totalDealValue > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            ${(account.totalDealValue / 1000).toFixed(0)}K pipeline
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Account</DropdownMenuItem>
                      <DropdownMenuItem>Add Contact</DropdownMenuItem>
                      <DropdownMenuItem>Create Deal</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

