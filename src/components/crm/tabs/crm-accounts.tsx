"use client"

import { useState } from 'react'
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
  MapPin
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'

interface Account {
  id: string
  name: string
  industry: string
  employees: number
  annualRevenue: number
  location: string
  status: 'active' | 'inactive' | 'prospect'
  contacts: number
  deals: number
  totalDealValue: number
}

export function CRMAccounts() {
  const [searchTerm, setSearchTerm] = useState('')
  const [accounts] = useState<Account[]>([
    {
      id: '1',
      name: 'Acme Corp',
      industry: 'Technology',
      employees: 250,
      annualRevenue: 50000000,
      location: 'San Francisco, CA',
      status: 'active',
      contacts: 12,
      deals: 3,
      totalDealValue: 250000,
    },
    {
      id: '2',
      name: 'TechStart Inc',
      industry: 'Software',
      employees: 85,
      annualRevenue: 15000000,
      location: 'Austin, TX',
      status: 'active',
      contacts: 8,
      deals: 2,
      totalDealValue: 90000,
    },
    {
      id: '3',
      name: 'GlobalTech',
      industry: 'Consulting',
      employees: 500,
      annualRevenue: 120000000,
      location: 'New York, NY',
      status: 'prospect',
      contacts: 5,
      deals: 1,
      totalDealValue: 89000,
    },
  ])

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.location.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer accounts and companies
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Account
        </Button>
      </div>

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
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-2">
                      <span>{account.industry}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {account.employees} employees
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {account.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        {account.contacts} contacts
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-muted-foreground" />
                        {account.deals} deals
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        ${(account.totalDealValue / 1000).toFixed(0)}K pipeline
                      </span>
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
        </CardContent>
      </Card>
    </div>
  )
}

