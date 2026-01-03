"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { getPayments, getPaymentStats, type Payment } from '@/lib/payment-functions'
import { getInvoice } from '@/lib/invoicing-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter,
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle,
  MoreVertical,
  Loader2,
  AlertCircle,
  Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PaymentWithInvoice extends Payment {
  invoice_number?: string
  client_name?: string
}

export function InvoicingPayments() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [payments, setPayments] = useState<PaymentWithInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalReceived: 0,
    pendingAmount: 0,
    totalTransactions: 0,
    heldAmount: 0,
  })

  const spaceId = session?.user?.company_id || null

  useEffect(() => {
    loadPayments()
    loadStats()
  }, [spaceId])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const result = await getPayments(spaceId || undefined)
      if (result.success && result.data) {
        // Enrich with invoice data
        const enrichedPayments = await Promise.all(
          result.data.map(async (payment) => {
            if (payment.invoice_id) {
              const invoiceResult = await getInvoice(payment.invoice_id)
              if (invoiceResult.success && invoiceResult.data) {
                return {
                  ...payment,
                  invoice_number: invoiceResult.data.invoice_number,
                  client_name: invoiceResult.data.client_name,
                }
              }
            }
            return payment
          })
        )
        setPayments(enrichedPayments)
      }
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await getPaymentStats(spaceId || undefined)
      if (result.success && result.data) {
        setStats(result.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const filteredPayments = payments.filter(payment =>
    payment.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.stripe_payment_intent_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      credit_card: 'Credit Card',
      bank_transfer: 'Bank Transfer',
      check: 'Check',
      cash: 'Cash',
      paypal: 'PayPal',
      stripe: 'Stripe',
      ach: 'ACH',
    }
    return labels[method] || method
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'pending':
      case 'processing':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'refunded':
      case 'partially_refunded':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.totalReceived.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ${stats.pendingAmount.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Held Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${stats.heldAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Under review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
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
                placeholder="Search payments..."
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

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payments found</div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">
                          {payment.payment_reference || payment.stripe_payment_intent_id || `Payment ${payment.id.slice(0, 8)}`}
                        </h3>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                        {payment.is_held && (
                          <Badge variant="outline" className="text-orange-600">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Held
                          </Badge>
                        )}
                        {payment.manual_review_required && (
                          <Badge variant="outline" className="text-amber-600">
                            <Clock className="w-3 h-3 mr-1" />
                            Review
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {payment.invoice_number && `${payment.invoice_number} • `}
                        {payment.client_name || 'No client'}
                      </p>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">{payment.currency} {payment.amount.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{getMethodLabel(payment.payment_method)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </span>
                        </span>
                        {payment.payout_eligible && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span className="text-xs">Payout Eligible</span>
                          </span>
                        )}
                      </div>
                      {payment.hold_reason && (
                        <p className="text-xs text-orange-600 mt-1">
                          Hold reason: {payment.hold_reason}
                        </p>
                      )}
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
                      {payment.invoice_id && (
                        <DropdownMenuItem
                          onClick={() => {
                            if (payment.invoice_id) {
                              window.open(`/invoice/${payment.invoice_id}`, '_blank')
                            }
                          }}
                        >
                          View Invoice
                        </DropdownMenuItem>
                      )}
                      {payment.status === 'completed' && (
                        <DropdownMenuItem>Download Receipt</DropdownMenuItem>
                      )}
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

