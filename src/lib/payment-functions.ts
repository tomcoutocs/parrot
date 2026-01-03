// Payment Functions
// Functions for managing payments

import { supabase } from './supabase'

export interface Payment {
  id: string
  invoice_id: string | null
  space_id: string | null
  amount: number
  currency: string
  payment_method: string
  payment_reference: string | null
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  stripe_status: string | null
  is_held: boolean
  hold_reason: string | null
  hold_release_date: string | null
  payout_eligible: boolean
  payout_eligible_date: string | null
  payout_date: string | null
  manual_review_required: boolean
  review_status: string
  review_notes: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded' | 'cancelled'
  failure_reason: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Get all payments for a space
 */
export async function getPayments(spaceId?: string): Promise<{ success: boolean; data?: Payment[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    let query = supabase
      .from('payments')
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
    return { success: false, error: 'Failed to fetch payments' }
  }
}

/**
 * Get payment by ID
 */
export async function getPayment(paymentId: string): Promise<{ success: boolean; data?: Payment; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'Failed to fetch payment' }
  }
}

/**
 * Get payment statistics
 */
export async function getPaymentStats(spaceId?: string): Promise<{
  success: boolean
  data?: {
    totalReceived: number
    pendingAmount: number
    totalTransactions: number
    heldAmount: number
  }
  error?: string
}> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    let query = supabase.from('payments').select('amount, status, is_held')

    if (spaceId) {
      query = query.eq('space_id', spaceId)
    }

    const { data: payments, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    const totalReceived = payments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const pendingAmount = payments?.filter(p => p.status === 'pending' || p.status === 'processing').reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const heldAmount = payments?.filter(p => p.is_held).reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    const totalTransactions = payments?.length || 0

    return {
      success: true,
      data: {
        totalReceived,
        pendingAmount,
        totalTransactions,
        heldAmount,
      },
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch payment stats' }
  }
}

