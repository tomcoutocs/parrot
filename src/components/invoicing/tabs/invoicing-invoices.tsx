"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { getInvoices, type Invoice } from '@/lib/invoicing-functions'
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
  Eye,
  Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreateInvoiceModal } from '@/components/modals/create-invoice-modal'
import { toastSuccess, toastError } from '@/lib/toast'

export function InvoicingInvoices() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Get space_id from session
  const spaceId = session?.user?.company_id || null

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getInvoices(spaceId || undefined)
      if (result.success && result.data) {
        setInvoices(result.data)
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }, [spaceId])

  // Fetch invoices
  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onInvoiceCreated={() => {
          loadInvoices()
          setIsCreateModalOpen(false)
        }}
        spaceId={spaceId}
      />

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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All ({filteredInvoices.length})</TabsTrigger>
                <TabsTrigger value="paid">Paid ({paidInvoices.length})</TabsTrigger>
                <TabsTrigger value="sent">Sent ({sentInvoices.length})</TabsTrigger>
                <TabsTrigger value="overdue">Overdue ({overdueInvoices.length})</TabsTrigger>
                <TabsTrigger value="draft">Draft ({draftInvoices.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <InvoiceList invoices={filteredInvoices} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} loadInvoices={loadInvoices} />
              </TabsContent>
              <TabsContent value="paid" className="mt-4">
                <InvoiceList invoices={paidInvoices} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} loadInvoices={loadInvoices} />
              </TabsContent>
              <TabsContent value="sent" className="mt-4">
                <InvoiceList invoices={sentInvoices} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} loadInvoices={loadInvoices} />
              </TabsContent>
              <TabsContent value="overdue" className="mt-4">
                <InvoiceList invoices={overdueInvoices} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} loadInvoices={loadInvoices} />
              </TabsContent>
              <TabsContent value="draft" className="mt-4">
                <InvoiceList invoices={draftInvoices} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} loadInvoices={loadInvoices} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InvoiceList({ invoices, getStatusColor, getStatusIcon, loadInvoices }: { 
  invoices: Invoice[], 
  getStatusColor: (status: string) => string,
  getStatusIcon: (status: string) => any,
  loadInvoices: () => Promise<void>
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
                  <h3 className="font-medium">{invoice.invoice_number}</h3>
                  <Badge className={getStatusColor(invoice.status)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {invoice.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{invoice.client_name}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Issued: {new Date(invoice.issue_date).toLocaleDateString()}</span>
                  <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                  <span className="font-medium text-foreground">{invoice.currency} {invoice.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (invoice.hosted_link_token) {
                    window.open(`/invoice/${invoice.hosted_link_token}`, '_blank')
                  }
                }}
              >
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
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        const { sendInvoice } = await import('@/lib/invoicing-functions')
                        const result = await sendInvoice(invoice.id)
                        if (result.success) {
                          toastSuccess('Invoice sent successfully')
                          loadInvoices()
                        } else {
                          toastError(result.error || 'Failed to send invoice')
                        }
                      } catch (err) {
                        console.error('Error sending invoice:', err)
                        toastError('Failed to send invoice')
                      }
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/invoices/${invoice.id}/generate-pdf`)
                        if (!response.ok) throw new Error('Failed to generate PDF')
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `invoice-${invoice.invoice_number}.pdf`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        window.URL.revokeObjectURL(url)
                      } catch (err) {
                        console.error('Error downloading PDF:', err)
                        toastError('Failed to download PDF')
                      }
                    }}
                  >
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

