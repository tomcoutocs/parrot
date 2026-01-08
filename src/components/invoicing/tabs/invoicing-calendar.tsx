"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { getInvoices, getInvoice, type Invoice } from '@/lib/invoicing-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  FileText,
  Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns'

export function InvoicingCalendar() {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

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

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  // Get invoices for a specific date
  const getInvoicesForDate = (date: Date): Invoice[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return invoices.filter(invoice => {
      const dueDate = format(new Date(invoice.due_date), 'yyyy-MM-dd')
      return dueDate === dateStr
    })
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30'
      case 'sent':
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
      case 'overdue':
        return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
      case 'draft':
        return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30'
      case 'partially_paid':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30'
    }
  }

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  // Handle date click
  const handleDateClick = (date: Date) => {
    const dateInvoices = getInvoicesForDate(date)
    if (dateInvoices.length > 0) {
      setSelectedDate(date)
      // If only one invoice, open it directly
      if (dateInvoices.length === 1) {
        setSelectedInvoice(dateInvoices[0])
        setIsInvoiceModalOpen(true)
      } else {
        // Multiple invoices - show first one, but allow navigation
        setSelectedInvoice(dateInvoices[0])
        setIsInvoiceModalOpen(true)
      }
    }
  }

  // Navigate between invoices on the same date
  const navigateInvoice = (direction: 'prev' | 'next') => {
    if (!selectedDate) return
    const dateInvoices = getInvoicesForDate(selectedDate)
    if (!selectedInvoice || dateInvoices.length <= 1) return
    
    const currentIndex = dateInvoices.findIndex(inv => inv.id === selectedInvoice.id)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'prev' 
      ? (currentIndex - 1 + dateInvoices.length) % dateInvoices.length
      : (currentIndex + 1) % dateInvoices.length
    
    setSelectedInvoice(dateInvoices[newIndex])
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoice Calendar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View invoices by due date
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm font-medium min-w-[200px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Calendar */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map(day => (
                <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isToday = isSameDay(day, new Date())
                const dayInvoices = getInvoicesForDate(day)
                const isSelected = selectedDate && isSameDay(day, selectedDate)

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[100px] border rounded-lg p-2 transition-colors
                      ${isCurrentMonth ? 'bg-background' : 'bg-muted/30 opacity-50'}
                      ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}
                      ${isSelected ? 'ring-2 ring-primary' : ''}
                      ${dayInvoices.length > 0 ? 'cursor-pointer hover:bg-muted/50' : ''}
                    `}
                    onClick={() => handleDateClick(day)}
                  >
                    <div className={`
                      text-sm font-medium mb-1
                      ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                      ${isToday ? 'text-primary' : ''}
                    `}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayInvoices.slice(0, 3).map((invoice) => (
                        <div
                          key={invoice.id}
                          className={`
                            text-xs px-1.5 py-0.5 rounded border truncate
                            ${getStatusColor(invoice.status)}
                          `}
                          title={`${invoice.invoice_number} - ${invoice.client_name} - ${format(new Date(invoice.due_date), 'MMM d')}`}
                        >
                          {invoice.invoice_number}
                        </div>
                      ))}
                      {dayInvoices.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1.5">
                          +{dayInvoices.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">Paid</Badge>
            <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">Sent</Badge>
            <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">Overdue</Badge>
            <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30">Draft</Badge>
            <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">Partially Paid</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Detail Modal */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Invoice Details</DialogTitle>
                <DialogDescription>
                  Due Date: {selectedInvoice && format(new Date(selectedInvoice.due_date), 'MMMM d, yyyy')}
                  {selectedDate && getInvoicesForDate(selectedDate).length > 1 && (
                    <span className="ml-2">
                      ({getInvoicesForDate(selectedDate).findIndex(inv => inv.id === selectedInvoice?.id) + 1} of {getInvoicesForDate(selectedDate).length})
                    </span>
                  )}
                </DialogDescription>
              </div>
              {selectedDate && getInvoicesForDate(selectedDate).length > 1 && (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateInvoice('prev')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateInvoice('next')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-medium">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedInvoice.status)}>
                    {selectedInvoice.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{selectedInvoice.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium">{selectedInvoice.currency} {selectedInvoice.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium">{format(new Date(selectedInvoice.issue_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{format(new Date(selectedInvoice.due_date), 'MMM d, yyyy')}</p>
                </div>
              </div>
              {selectedInvoice.client_email && (
                <div>
                  <p className="text-sm text-muted-foreground">Client Email</p>
                  <p className="font-medium">{selectedInvoice.client_email}</p>
                </div>
              )}
              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedInvoice.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4 border-t">
                {selectedInvoice.hosted_link_token && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(`/invoice/${selectedInvoice.hosted_link_token}`, '_blank')
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Public Invoice
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsInvoiceModalOpen(false)
                    setSelectedInvoice(null)
                    setSelectedDate(null)
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

