// Client Management Functions
// CRUD operations for clients

import { supabase } from './supabase'
import { getCurrentUser } from './auth'

export interface Client {
  id: string
  space_id: string | null
  name: string
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
  notes: string | null
  referral_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateClientData {
  name: string
  email?: string
  phone?: string
  address?: string
  tax_id?: string
  notes?: string
  referral_id?: string
}

/**
 * Create a new client
 */
export async function createClient(
  data: CreateClientData,
  spaceId?: string
): Promise<{ success: boolean; data?: Client; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const finalSpaceId = spaceId || currentUser.companyId || null

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        space_id: finalSpaceId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        tax_id: data.tax_id || null,
        notes: data.notes || null,
        referral_id: data.referral_id || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: client }
  } catch (error) {
    console.error('Error creating client:', error)
    return { success: false, error: 'Failed to create client' }
  }
}

/**
 * Get all clients for a space
 */
export async function getClients(spaceId?: string): Promise<{ success: boolean; data?: Client[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    let query = supabase
      .from('clients')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (spaceId) {
      query = query.eq('space_id', spaceId)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch clients' }
  }
}

/**
 * Get client by ID
 */
export async function getClient(clientId: string): Promise<{ success: boolean; data?: Client; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'Failed to fetch client' }
  }
}

/**
 * Update client
 */
export async function updateClient(
  clientId: string,
  data: Partial<CreateClientData>
): Promise<{ success: boolean; data?: Client; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data: client, error } = await supabase
      .from('clients')
      .update({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        tax_id: data.tax_id || null,
        notes: data.notes || null,
        referral_id: data.referral_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: client }
  } catch (error) {
    return { success: false, error: 'Failed to update client' }
  }
}

/**
 * Delete client (soft delete by setting is_active to false)
 */
export async function deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('clients')
      .update({ is_active: false })
      .eq('id', clientId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete client' }
  }
}

/**
 * Get client statistics (total invoiced, paid, outstanding)
 */
export async function getClientStats(clientId: string): Promise<{
  success: boolean
  data?: {
    totalInvoiced: number
    totalPaid: number
    outstanding: number
    invoiceCount: number
  }
  error?: string
}> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get all invoices for this client
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('total_amount, paid_amount, status')
      .eq('client_id', clientId)

    if (invoicesError) {
      return { success: false, error: invoicesError.message }
    }

    const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
    const totalPaid = invoices?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0
    const outstanding = totalInvoiced - totalPaid
    const invoiceCount = invoices?.length || 0

    return {
      success: true,
      data: {
        totalInvoiced,
        totalPaid,
        outstanding,
        invoiceCount,
      },
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch client stats' }
  }
}

