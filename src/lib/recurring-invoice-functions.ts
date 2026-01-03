// Recurring Invoice Functions
// Functions for managing recurring invoices

import { supabase } from './supabase'
import { getCurrentUser } from './auth'
import { createInvoice, type CreateInvoiceData } from './invoicing-functions'

export interface RecurringInvoice {
  id: string
  space_id: string | null
  name: string
  client_id: string | null
  client_name: string
  template_data: any // JSONB with invoice template
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  start_date: string
  next_date: string
  end_date: string | null
  status: 'active' | 'paused' | 'cancelled'
  total_generated: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateRecurringInvoiceData {
  name: string
  client_id?: string | null
  client_name: string
  template_data: CreateInvoiceData
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  start_date: string
  end_date?: string | null
}

/**
 * Calculate next invoice date based on frequency
 */
function calculateNextDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate)
  
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
  }
  
  return date.toISOString().split('T')[0]
}

/**
 * Create recurring invoice
 */
export async function createRecurringInvoice(
  data: CreateRecurringInvoiceData,
  spaceId?: string
): Promise<{ success: boolean; data?: RecurringInvoice; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const finalSpaceId = spaceId || currentUser.companyId || null
    const nextDate = calculateNextDate(data.start_date, data.frequency)

    const { data: recurring, error } = await supabase
      .from('recurring_invoices')
      .insert({
        space_id: finalSpaceId,
        name: data.name,
        client_id: data.client_id || null,
        client_name: data.client_name,
        template_data: data.template_data,
        frequency: data.frequency,
        start_date: data.start_date,
        next_date: nextDate,
        end_date: data.end_date || null,
        status: 'active',
        total_generated: 0,
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: recurring }
  } catch (error) {
    console.error('Error creating recurring invoice:', error)
    return { success: false, error: 'Failed to create recurring invoice' }
  }
}

/**
 * Get all recurring invoices
 */
export async function getRecurringInvoices(spaceId?: string): Promise<{ success: boolean; data?: RecurringInvoice[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    let query = supabase
      .from('recurring_invoices')
      .select('*')
      .order('next_date', { ascending: true })

    if (spaceId) {
      query = query.eq('space_id', spaceId)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch recurring invoices' }
  }
}

/**
 * Generate invoice from recurring template
 */
export async function generateInvoiceFromRecurring(
  recurringId: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get recurring invoice
    const { data: recurring, error: recurringError } = await supabase
      .from('recurring_invoices')
      .select('*')
      .eq('id', recurringId)
      .single()

    if (recurringError || !recurring) {
      return { success: false, error: 'Recurring invoice not found' }
    }

    if (recurring.status !== 'active') {
      return { success: false, error: 'Recurring invoice is not active' }
    }

    // Create invoice from template
    const templateData = recurring.template_data as CreateInvoiceData
    const result = await createInvoice(
      {
        ...templateData,
        client_name: recurring.client_name,
        client_id: recurring.client_id || undefined,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: calculateNextDate(new Date().toISOString().split('T')[0], 'monthly'), // Default 30 days
      },
      recurring.space_id || undefined
    )

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Update recurring invoice
    const nextDate = calculateNextDate(recurring.next_date, recurring.frequency)
    await supabase
      .from('recurring_invoices')
      .update({
        next_date: nextDate,
        total_generated: (recurring.total_generated || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recurringId)

    return { success: true, invoiceId: result.data?.id }
  } catch (error) {
    console.error('Error generating invoice:', error)
    return { success: false, error: 'Failed to generate invoice' }
  }
}

/**
 * Update recurring invoice status
 */
export async function updateRecurringInvoiceStatus(
  recurringId: string,
  status: 'active' | 'paused' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('recurring_invoices')
      .update({ status })
      .eq('id', recurringId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update status' }
  }
}

