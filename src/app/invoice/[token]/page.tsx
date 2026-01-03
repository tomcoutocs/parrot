"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getInvoiceByToken, type Invoice, type InvoiceLineItem } from '@/lib/invoicing-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Download, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function PublicInvoicePage() {
  const params = useParams()
  const token = params?.token as string
  const [invoice, setInvoice] = useState<(Invoice & { line_items: InvoiceLineItem[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      loadInvoice()
    }
  }, [token])

  const loadInvoice = async () => {
    try {
      setLoading(true)
      const result = await getInvoiceByToken(token)
      if (result.success && result.data) {
        setInvoice(result.data)
      } else {
        setError(result.error || 'Invoice not found')
      }
    } catch (err) {
      setError('Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoice) return
    
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
      alert('Failed to download PDF')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>
      case 'sent':
      case 'viewed':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><Clock className="w-3 h-3 mr-1" />Sent</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Overdue</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error || 'Invoice not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl">INVOICE</CardTitle>
              <div className="flex items-center gap-3">
                {getStatusBadge(invoice.status)}
                <Button onClick={handleDownloadPDF} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Bill To</h3>
                <p className="font-medium">{invoice.client_name}</p>
                {invoice.client_email && <p className="text-sm text-muted-foreground">{invoice.client_email}</p>}
                {invoice.client_address && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.client_address}</p>
                )}
              </div>
              <div className="text-right">
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Invoice #:</span> <span className="font-medium">{invoice.invoice_number}</span></p>
                  <p><span className="text-muted-foreground">Issue Date:</span> <span className="font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</span></p>
                  <p><span className="text-muted-foreground">Due Date:</span> <span className="font-medium">{new Date(invoice.due_date).toLocaleDateString()}</span></p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Description</th>
                    <th className="text-center py-3 px-4 font-semibold">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold">Price</th>
                    <th className="text-right py-3 px-4 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item, index) => (
                    <tr key={item.id || index} className="border-b">
                      <td className="py-3 px-4">{item.description}</td>
                      <td className="text-center py-3 px-4">{item.quantity}</td>
                      <td className="text-right py-3 px-4">{invoice.currency} {item.unit_price.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 font-medium">{invoice.currency} {item.line_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span>-{invoice.currency} {invoice.discount.toFixed(2)}</span>
                  </div>
                )}
                {invoice.tax_rate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({invoice.tax_rate}%):</span>
                    <span>{invoice.currency} {invoice.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{invoice.currency} {invoice.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            {(invoice.notes || invoice.terms) && (
              <div className="space-y-4 pt-4 border-t">
                {invoice.notes && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Terms & Conditions</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.terms}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

