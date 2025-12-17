"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  Mail,
  Phone,
  Building2,
  DollarSign,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  company: string
  totalInvoiced: number
  totalPaid: number
  outstanding: number
  avatar?: string
}

export function InvoicingClients() {
  const [searchTerm, setSearchTerm] = useState('')
  const [clients] = useState<Client[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@acmecorp.com',
      phone: '+1 (555) 123-4567',
      company: 'Acme Corp',
      totalInvoiced: 45000,
      totalPaid: 40000,
      outstanding: 5000,
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@techstart.io',
      phone: '+1 (555) 234-5678',
      company: 'TechStart Inc',
      totalInvoiced: 28000,
      totalPaid: 24500,
      outstanding: 3500,
    },
    {
      id: '3',
      name: 'Michael Chen',
      email: 'mchen@globaltech.com',
      phone: '+1 (555) 345-6789',
      company: 'GlobalTech',
      totalInvoiced: 120000,
      totalPaid: 108000,
      outstanding: 12000,
    },
  ])

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your clients and their billing information
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Client
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
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

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Avatar>
                    <AvatarImage src={client.avatar} />
                    <AvatarFallback>
                      {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{client.name}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {client.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Invoiced:</span>
                        <span className="font-medium">${client.totalInvoiced.toLocaleString()}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-medium text-green-600">${client.totalPaid.toLocaleString()}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-amber-600" />
                        <span className="text-muted-foreground">Outstanding:</span>
                        <span className="font-medium text-amber-600">${client.outstanding.toLocaleString()}</span>
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
                    <DropdownMenuItem>Edit Client</DropdownMenuItem>
                    <DropdownMenuItem>Create Invoice</DropdownMenuItem>
                    <DropdownMenuItem>View Invoices</DropdownMenuItem>
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

