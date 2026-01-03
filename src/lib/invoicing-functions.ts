// Invoicing and Billing Functions
// Core functions for the invoicing MVP

import { supabase } from './supabase'
import { getCurrentUser } from './auth'

export interface Invoice {
  id: string
  invoice_number: string
  space_id: string | null
  client_id: string | null
  client_name: string
  client_email: string | null
  client_address: string | null
  issue_date: string
  due_date: string
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid'
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount: number
  total_amount: number
  currency: string
  paid_amount: number
  logo_url: string | null
  notes: string | null
  terms: string | null
  footer_text: string | null
  hosted_link_token: string | null
  pdf_url: string | null
  last_viewed_at: string | null
  last_sent_at: string | null
  paid_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  is_offline_draft: boolean
  offline_sync_status: 'synced' | 'pending' | 'failed'
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  line_total: number
  sort_order: number
}

export interface CreateInvoiceData {
  client_id?: string | null
  client_name: string
  client_email?: string
  client_address?: string
  issue_date?: string
  due_date: string
  line_items: Array<{
    description: string
    quantity: number
    unit_price: number
    tax_rate?: number
  }>
  tax_rate?: number
  discount?: number
  currency?: string
  notes?: string
  terms?: string
  footer_text?: string
  logo_url?: string
}

// Generate unique invoice number
function generateInvoiceNumber(spaceId?: string): string {
  const prefix = 'INV'
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}-${year}-${random}`
}

// Generate hosted link token
function generateHostedLinkToken(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 32)
}

/**
 * Create a new invoice in <30 seconds
 * Smart defaults: auto-calculates totals, applies tax, sets currency
 */
export async function createInvoice(
  data: CreateInvoiceData,
  spaceId?: string
): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get space_id from user if not provided
    const finalSpaceId = spaceId || currentUser.companyId || null

    // Calculate totals
    const lineItems = data.line_items || []
    let subtotal = 0
    
    const calculatedLineItems = lineItems.map(item => {
      const quantity = item.quantity || 1
      const unitPrice = item.unit_price || 0
      const lineTotal = quantity * unitPrice
      subtotal += lineTotal
      
      return {
        description: item.description,
        quantity,
        unit_price: unitPrice,
        tax_rate: item.tax_rate || 0,
        line_total: lineTotal
      }
    })

    // Apply discount
    const discount = data.discount || 0
    const subtotalAfterDiscount = subtotal - discount

    // Calculate tax
    const taxRate = data.tax_rate || 0
    const taxAmount = subtotalAfterDiscount * (taxRate / 100)
    const totalAmount = subtotalAfterDiscount + taxAmount

    // Generate invoice number and token
    const invoiceNumber = generateInvoiceNumber(finalSpaceId || undefined)
    const hostedLinkToken = generateHostedLinkToken()

    // Set smart defaults
    const issueDate = data.issue_date || new Date().toISOString().split('T')[0]
    const currency = data.currency || 'USD'

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        space_id: finalSpaceId,
        client_id: data.client_id || null,
        client_name: data.client_name,
        client_email: data.client_email || null,
        client_address: data.client_address || null,
        issue_date: issueDate,
        due_date: data.due_date,
        status: 'draft',
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount,
        total_amount: totalAmount,
        currency,
        notes: data.notes || null,
        terms: data.terms || null,
        footer_text: data.footer_text || null,
        logo_url: data.logo_url || null,
        hosted_link_token: hostedLinkToken,
        created_by: currentUser.id,
        is_offline_draft: false,
        offline_sync_status: 'synced'
      })
      .select()
      .single()

    if (invoiceError) {
      return { success: false, error: invoiceError.message }
    }

    // Create line items
    if (calculatedLineItems.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(
          calculatedLineItems.map((item, index) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            line_total: item.line_total,
            sort_order: index
          }))
        )

      if (lineItemsError) {
        // Delete invoice if line items fail
        await supabase.from('invoices').delete().eq('id', invoice.id)
        return { success: false, error: lineItemsError.message }
      }
    }

    return { success: true, data: invoice }
  } catch (error) {
    console.error('Error creating invoice:', error)
    return { success: false, error: 'Failed to create invoice' }
  }
}

/**
 * Auto-save invoice draft
 * Saves automatically as user types (debounced)
 */
export async function autoSaveInvoice(
  invoiceId: string,
  updates: Partial<CreateInvoiceData>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Recalculate totals if line items changed
    if (updates.line_items) {
      const lineItems = updates.line_items
      let subtotal = 0
      
      lineItems.forEach(item => {
        const quantity = item.quantity || 1
        const unitPrice = item.unit_price || 0
        subtotal += quantity * unitPrice
      })

      const discount = updates.discount || 0
      const subtotalAfterDiscount = subtotal - discount
      const taxRate = updates.tax_rate || 0
      const taxAmount = subtotalAfterDiscount * (taxRate / 100)
      const totalAmount = subtotalAfterDiscount + taxAmount

      const { error } = await supabase
        .from('invoices')
        .update({
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) {
        return { success: false, error: error.message }
      }
    }

    // Update other fields
    const updateData: any = {}
    if (updates.client_name) updateData.client_name = updates.client_name
    if (updates.client_email) updateData.client_email = updates.client_email
    if (updates.client_address) updateData.client_address = updates.client_address
    if (updates.due_date) updateData.due_date = updates.due_date
    if (updates.notes) updateData.notes = updates.notes
    if (updates.terms) updateData.terms = updates.terms

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)

      if (error) {
        return { success: false, error: error.message }
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to auto-save invoice' }
  }
}

/**
 * Get invoice by ID with line items
 */
export async function getInvoice(invoiceId: string): Promise<{ success: boolean; data?: Invoice & { line_items: InvoiceLineItem[] }; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      return { success: false, error: invoiceError.message }
    }

    const { data: lineItems, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order')

    if (lineItemsError) {
      return { success: false, error: lineItemsError.message }
    }

    return {
      success: true,
      data: {
        ...invoice,
        line_items: lineItems || []
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch invoice' }
  }
}

/**
 * Get invoice by hosted link token (public view)
 */
export async function getInvoiceByToken(token: string): Promise<{ success: boolean; data?: Invoice & { line_items: InvoiceLineItem[] }; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('hosted_link_token', token)
      .single()

    if (invoiceError) {
      return { success: false, error: 'Invoice not found' }
    }

    // Update last viewed timestamp
    await supabase
      .from('invoices')
      .update({ last_viewed_at: new Date().toISOString() })
      .eq('id', invoice.id)

    // Update status to 'viewed' if it was 'sent'
    if (invoice.status === 'sent') {
      await supabase
        .from('invoices')
        .update({ status: 'viewed' })
        .eq('id', invoice.id)
    }

    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('sort_order')

    return {
      success: true,
      data: {
        ...invoice,
        line_items: lineItems || []
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch invoice' }
  }
}

/**
 * Send invoice (updates status and sends email)
 */
export async function sendInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get invoice data
    const invoiceResult = await getInvoice(invoiceId)
    if (!invoiceResult.success || !invoiceResult.data) {
      return { success: false, error: 'Invoice not found' }
    }

    const invoice = invoiceResult.data

    // Update invoice status
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        last_sent_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Send email with hosted link
    if (invoice.client_email && invoice.hosted_link_token) {
      try {
        const response = await fetch('/api/invoices/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: invoice.id,
            to: invoice.client_email,
            clientName: invoice.client_name,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.total_amount,
            currency: invoice.currency,
            hostedLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invoice/${invoice.hosted_link_token}`,
          }),
        })

        const result = await response.json()
        if (!result.success) {
          console.error('Failed to send email:', result.error)
          // Don't fail the whole operation if email fails
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // Don't fail the whole operation if email fails
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to send invoice' }
  }
}

/**
 * Get all invoices for a space
 */
export async function getInvoices(spaceId?: string): Promise<{ success: boolean; data?: Invoice[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })

    if (spaceId) {
      query = query.eq('space_id', spaceId)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch invoices' }
  }
}

