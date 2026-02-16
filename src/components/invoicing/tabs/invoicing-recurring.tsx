"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import {
  getRecurringInvoices,
  generateInvoiceFromRecurring,
  updateRecurringInvoiceStatus,
  type RecurringInvoice,
} from '@/lib/recurring-invoice-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter,
  Repeat,
  Calendar,
  DollarSign,
  Pause,
  Play,
  MoreVertical,
  CheckCircle,
  Loader2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toastSuccess, toastError } from '@/lib/toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

const isTableNotFoundError = (err: string) =>
  err?.toLowerCase().includes('does not exist') ||
  err?.toLowerCase().includes('relation') ||
  err?.toLowerCase().includes('404') ||
  err?.toLowerCase().includes('not found')

export function InvoicingRecurring() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [recurring, setRecurring] = useState<RecurringInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const spaceId = session?.user?.company_id || null

  useEffect(() => {
    loadRecurring()
  }, [spaceId])

  const loadRecurring = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const result = await getRecurringInvoices(spaceId || undefined)
      if (result.success && result.data) {
        setRecurring(result.data)
      } else if (!result.success && result.error) {
        setLoadError(result.error)
        setRecurring([])
      }
    } catch (error) {
      console.error('Error loading recurring invoices:', error)
      setLoadError('Failed to load recurring invoices. Please try again.')
      setRecurring([])
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (id: string) => {
    try {
      const result = await generateInvoiceFromRecurring(id)
      if (result.success) {
        toastSuccess('Invoice generated successfully')
        loadRecurring()
      } else {
        toastError(result.error || 'Failed to generate invoice')
      }
    } catch (error) {
      toastError('Failed to generate invoice')
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    try {
      const result = await updateRecurringInvoiceStatus(id, newStatus as 'active' | 'paused')
      if (result.success) {
        toastSuccess(`Recurring invoice ${newStatus}`)
        loadRecurring()
      } else {
        toastError(result.error || 'Failed to update status')
      }
    } catch (error) {
      toastError('Failed to update status')
    }
  }

  const filteredRecurring = recurring.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate amount from template
  const getAmount = (item: RecurringInvoice) => {
    const template = item.template_data as any
    return template?.total_amount || 0
  }

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
    }
    return labels[freq] || freq
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'paused':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
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
          New Recurring Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recurring.filter(r => r.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${recurring
                .filter(r => r.status === 'active' && r.frequency === 'monthly')
                .reduce((sum, r) => sum + getAmount(r), 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recurring.reduce((sum, r) => sum + (r.total_generated || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">invoices created</p>
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
                placeholder="Search recurring invoices..."
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

      {/* Recurring List */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring Invoices ({filteredRecurring.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <div className="space-y-3">
              <Alert variant="destructive" className="gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <AlertDescription>
                  {isTableNotFoundError(loadError) ? (
                    'Recurring invoices are not yet set up for your workspace. Contact your administrator to run the invoicing database migration.'
                  ) : (
                    loadError
                  )}
                </AlertDescription>
              </Alert>
              <Button variant="outline" size="sm" onClick={loadRecurring}>
                Try Again
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecurring.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Repeat className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">No recurring invoices yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create recurring invoice templates to automate your billing.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecurring.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                      <Repeat className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.client_name}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">${getAmount(item).toLocaleString()}</span>
                          <span className="text-muted-foreground">/{getFrequencyLabel(item.frequency)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Next:</span>
                          <span className="font-medium">{new Date(item.next_date).toLocaleDateString()}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Generated:</span>
                          <span className="font-medium">{item.total_generated || 0} invoices</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerate(item.id)}
                      >
                        Generate Now
                      </Button>
                    )}
                    {item.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(item.id, item.status)}
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </Button>
                    ) : item.status === 'paused' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(item.id, item.status)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </Button>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>View History</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        {item.status !== 'cancelled' && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={async () => {
                              if (confirm('Are you sure you want to cancel this recurring invoice?')) {
                                const result = await updateRecurringInvoiceStatus(item.id, 'cancelled')
                                if (result.success) {
                                  toastSuccess('Recurring invoice cancelled')
                                  loadRecurring()
                                } else {
                                  toastError(result.error || 'Failed to cancel')
                                }
                              }
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

