"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { createInvoice, autoSaveInvoice, type CreateInvoiceData } from '@/lib/invoicing-functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Trash2, Save, X } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'
import { useDebouncedCallback } from '@/hooks/use-debounce'

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
}

interface CreateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onInvoiceCreated?: () => void
  spaceId?: string | null
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onInvoiceCreated,
  spaceId
}: CreateInvoiceModalProps) {
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)

  // Form state
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [dueDate, setDueDate] = useState(() => {
    // Smart default: 30 days from today
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date.toISOString().split('T')[0]
  })
  const [taxRate, setTaxRate] = useState(0) // Smart default: 0%
  const [discount, setDiscount] = useState(0)
  const [currency, setCurrency] = useState('USD') // Smart default
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0 }
  ])

  // Calculate totals
  const calculateTotals = useCallback(() => {
    let subtotal = 0
    lineItems.forEach(item => {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0)
      subtotal += lineTotal
    })
    const subtotalAfterDiscount = subtotal - (discount || 0)
    const taxAmount = subtotalAfterDiscount * ((taxRate || 0) / 100)
    const totalAmount = subtotalAfterDiscount + taxAmount
    
    return {
      subtotal,
      taxAmount,
      totalAmount
    }
  }, [lineItems, discount, taxRate])

  const totals = calculateTotals()

  // Auto-save function (debounced)
  const debouncedAutoSave = useDebouncedCallback(async () => {
    if (!invoiceId || !clientName.trim()) return

    setIsSaving(true)
    try {
      await autoSaveInvoice(invoiceId, {
        client_name: clientName,
        client_email: clientEmail || undefined,
        client_address: clientAddress || undefined,
        due_date: dueDate,
        tax_rate: taxRate,
        discount: discount,
        currency: currency,
        notes: notes || undefined,
        terms: terms || undefined,
        line_items: lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate
        }))
      })
      setLastSaved(new Date())
    } catch (error) {
      console.error('Auto-save failed:', error)
      // Don't show error toast for auto-save failures
    } finally {
      setIsSaving(false)
    }
  }, 2000) // 2 second debounce

  // Create initial draft invoice when client name is entered
  useEffect(() => {
    if (isOpen && !invoiceId && clientName.trim() && clientName.length > 2) {
      const createDraft = async () => {
        try {
          const result = await createInvoice({
            client_name: clientName,
            client_email: clientEmail || undefined,
            client_address: clientAddress || undefined,
            due_date: dueDate,
            line_items: lineItems.map(item => ({
              description: item.description || 'Item',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              tax_rate: item.tax_rate || 0
            })),
            tax_rate: taxRate,
            discount: discount,
            currency: currency,
            notes: notes || undefined,
            terms: terms || undefined
          }, spaceId || undefined)

          if (result.success && result.data) {
            setInvoiceId(result.data.id)
          }
        } catch (error) {
          console.error('Failed to create draft:', error)
        }
      }

      // Debounce draft creation
      const timeout = setTimeout(createDraft, 1500)
      return () => clearTimeout(timeout)
    }
  }, [isOpen, clientName, spaceId])

  // Auto-save when form changes (only if invoice already exists)
  useEffect(() => {
    if (invoiceId && isOpen && clientName.trim()) {
      debouncedAutoSave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, clientName, clientEmail, clientAddress, dueDate, taxRate, discount, currency, notes, terms, JSON.stringify(lineItems), isOpen])

  const handleAddLineItem = () => {
    setLineItems([...lineItems, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0
    }])
  }

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id))
    }
  }

  const handleLineItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!clientName.trim()) {
      toastError('Client name is required')
      return
    }

    if (lineItems.every(item => !item.description.trim())) {
      toastError('At least one line item with description is required')
      return
    }

    setIsSubmitting(true)

    try {
      // If we have a draft, we'll update it; otherwise create new
      if (invoiceId) {
        // Invoice already exists (was auto-saved), just close
        toastSuccess('Invoice created successfully!')
        onInvoiceCreated?.()
        handleClose()
      } else {
        // Create new invoice
        const result = await createInvoice({
          client_name: clientName,
          client_email: clientEmail || undefined,
          client_address: clientAddress || undefined,
          due_date: dueDate,
          line_items: lineItems
            .filter(item => item.description.trim())
            .map(item => ({
              description: item.description,
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              tax_rate: item.tax_rate || 0
            })),
          tax_rate: taxRate,
          discount: discount,
          currency: currency,
          notes: notes || undefined,
          terms: terms || undefined
        }, spaceId || undefined)

        if (result.success) {
          toastSuccess('Invoice created successfully!')
          onInvoiceCreated?.()
          handleClose()
        } else {
          toastError(result.error || 'Failed to create invoice')
        }
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      toastError('Failed to create invoice. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset form
    setClientName('')
    setClientEmail('')
    setClientAddress('')
    setDueDate(() => {
      const date = new Date()
      date.setDate(date.getDate() + 30)
      return date.toISOString().split('T')[0]
    })
    setTaxRate(0)
    setDiscount(0)
    setCurrency('USD')
    setNotes('')
    setTerms('')
    setLineItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0 }])
    setInvoiceId(null)
    setLastSaved(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">Create Invoice</DialogTitle>
              <DialogDescription className="mt-1">
                Create and send invoices in seconds. Auto-saved as you type.
              </DialogDescription>
            </div>
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {lastSaved && !isSaving && (
              <div className="text-xs text-muted-foreground">
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Client Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  placeholder="Acme Corp"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientAddress">Client Address</Label>
              <Textarea
                id="clientAddress"
                placeholder="123 Main St, City, State ZIP"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Invoice Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount ({currency})</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Line Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Input
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                      required={index === 0}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => handleLineItemChange(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="Tax %"
                      value={item.tax_rate}
                      onChange={(e) => handleLineItemChange(item.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1">
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLineItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{currency} {totals.subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span>-{currency} {discount.toFixed(2)}</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax ({taxRate}%):</span>
                    <span>{currency} {totals.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{currency} {totals.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes for the client..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                placeholder="Payment terms..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !clientName.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

