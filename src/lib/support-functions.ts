// Support Ticket Functions
// Support system with SLA tracking

import { supabase } from './supabase'
import { getCurrentUser } from './auth'

export interface SupportTicket {
  id: string
  space_id: string | null
  user_id: string | null
  subject: string
  description: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  sla_hours: number
  first_response_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface SupportMessage {
  id: string
  ticket_id: string
  user_id: string | null
  is_staff: boolean
  message: string
  attachments: any
  created_at: string
}

export interface CreateTicketData {
  subject: string
  description: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

/**
 * Create support ticket
 */
export async function createSupportTicket(
  data: CreateTicketData,
  spaceId?: string
): Promise<{ success: boolean; data?: SupportTicket; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const finalSpaceId = spaceId || currentUser.companyId || null
    const priority = data.priority || 'normal'
    const slaHours = priority === 'urgent' ? 2 : priority === 'high' ? 4 : priority === 'normal' ? 24 : 48

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        space_id: finalSpaceId,
        user_id: currentUser.id,
        subject: data.subject,
        description: data.description,
        priority,
        status: 'open',
        sla_hours: slaHours,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: ticket }
  } catch (error) {
    console.error('Error creating ticket:', error)
    return { success: false, error: 'Failed to create ticket' }
  }
}

/**
 * Get tickets for a user or space
 */
export async function getSupportTickets(spaceId?: string): Promise<{ success: boolean; data?: SupportTicket[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    let query = supabase
      .from('support_tickets')
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
    return { success: false, error: 'Failed to fetch tickets' }
  }
}

/**
 * Get messages for a ticket
 */
export async function getTicketMessages(ticketId: string): Promise<{ success: boolean; data?: SupportMessage[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch messages' }
  }
}

/**
 * Add message to ticket
 */
export async function addTicketMessage(
  ticketId: string,
  message: string
): Promise<{ success: boolean; data?: SupportMessage; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Check if this is first response (staff response)
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('first_response_at, status')
      .eq('id', ticketId)
      .single()

    const isFirstResponse = !ticket?.first_response_at
    const isStaff = currentUser.role === 'admin' || currentUser.role === 'internal'

    const { data: msg, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        user_id: currentUser.id,
        is_staff: isStaff,
        message,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Update ticket if first response
    if (isFirstResponse && isStaff) {
      await supabase
        .from('support_tickets')
        .update({
          first_response_at: new Date().toISOString(),
          status: 'in_progress',
        })
        .eq('id', ticketId)
    }

    return { success: true, data: msg }
  } catch (error) {
    return { success: false, error: 'Failed to add message' }
  }
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const updateData: any = { status }
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update ticket status' }
  }
}

/**
 * Calculate SLA status
 */
export function calculateSLAStatus(ticket: SupportTicket): {
  status: 'on_time' | 'at_risk' | 'breached'
  hoursRemaining: number | null
  hoursElapsed: number
} {
  const createdAt = new Date(ticket.created_at)
  const now = new Date()
  const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    return { status: 'on_time', hoursRemaining: null, hoursElapsed }
  }

  const hoursRemaining = ticket.sla_hours - hoursElapsed

  if (hoursRemaining < 0) {
    return { status: 'breached', hoursRemaining: 0, hoursElapsed }
  } else if (hoursRemaining < ticket.sla_hours * 0.2) {
    return { status: 'at_risk', hoursRemaining, hoursElapsed }
  }

  return { status: 'on_time', hoursRemaining, hoursElapsed }
}

