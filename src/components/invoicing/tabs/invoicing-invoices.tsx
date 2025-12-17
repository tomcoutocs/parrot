"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter,
  FileText,
  Download,
  Send,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  Eye
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Invoice {
  id: string
  invoiceNumber: string
  client: string
  amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  dueDate: string
  issueDate: string
  description: string
}

export function InvoicingInvoices() {
  const [searchTerm, setSearchTerm] = useState('')
  const [invoices] = useState<Invoice[]>([
    {
      id: '1',
      invoiceNumber: 'INV-2024-001',
      client: 'Acme Corp',
      amount: 5000,
      status: 'paid',
      dueDate: '2024-02-15',
      issueDate: '2024-02-01',
      description: 'Monthly subscription - February',
    },
    {
      id: '2',
      invoiceNumber: 'INV-2024-002',
      client: 'TechStart Inc',
      amount: 3500,
      status: 'sent',
      dueDate: '2024-02-20',
      issueDate: '2024-02-05',
      description: 'Web development services',
    },
    {
      id: '3',
      invoiceNumber: 'INV-2024-003',
      client: 'GlobalTech',
      amount: 12000,
      status: 'overdue',
      dueDate: '2024-02-10',
      issueDate: '2024-01-25',
      description: 'Q1 consulting services',
    },
    {
      id: '4',
      invoiceNumber: 'INV-2024-004',
      client: 'StartupXYZ',
      amount: 2500,
      status: 'draft',
      dueDate: '2024-02-25',
      issueDate: '2024-02-10',
      description: 'Logo design package',
    },
  ])

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.client.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return CheckCircle
      case 'sent':
        return Clock
      case 'overdue':
        return XCircle
      default:
        return FileText
    }
  }

  const paidInvoices = filteredInvoices.filter(i => i.status === 'paid')
  const sentInvoices = filteredInvoices.filter(i => i.status === 'sent')
  const overdueInvoices = filteredInvoices.filter(i => i.status === 'overdue')
  const draftInvoices = filteredInvoices.filter(i => i.status === 'draft')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
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

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({filteredInvoices.length})</TabsTrigger>
              <TabsTrigger value="paid">Paid ({paidInvoices.length})</TabsTrigger>
              <TabsTrigger value="sent">Sent ({sentInvoices.length})</TabsTrigger>
              <TabsTrigger value="overdue">Overdue ({overdueInvoices.length})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({draftInvoices.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <InvoiceList invoices={filteredInvoices} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
            </TabsContent>
            <TabsContent value="paid" className="mt-4">
              <InvoiceList invoices={paidInvoices} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
            </TabsContent>
            <TabsContent value="sent" className="mt-4">
              <InvoiceList invoices={sentInvoices} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
            </TabsContent>
            <TabsContent value="overdue" className="mt-4">
              <InvoiceList invoices={overdueInvoices} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
            </TabsContent>
            <TabsContent value="draft" className="mt-4">
              <InvoiceList invoices={draftInvoices} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function InvoiceList({ invoices, getStatusColor, getStatusIcon }: { 
  invoices: Invoice[], 
  getStatusColor: (status: string) => string,
  getStatusIcon: (status: string) => any
}) {
  if (invoices.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No invoices found</div>
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => {
        const StatusIcon = getStatusIcon(invoice.status)
        return (
          <div
            key={invoice.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{invoice.invoiceNumber}</h3>
                  <Badge className={getStatusColor(invoice.status)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {invoice.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{invoice.client}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Issued: {invoice.issueDate}</span>
                  <span>Due: {invoice.dueDate}</span>
                  <span className="font-medium text-foreground">${invoice.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem>Edit Invoice</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}

