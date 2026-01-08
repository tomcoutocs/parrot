// Automation Functions
// Core functions for the automations platform

import { supabase } from './supabase'
import { getCurrentUser } from './auth'

export interface Automation {
  id: string
  space_id: string | null
  user_id: string | null
  name: string
  description: string | null
  is_active: boolean
  is_public: boolean
  marketplace_id: string | null
  trigger_type: 'webhook' | 'schedule' | 'event' | 'api' | 'manual'
  trigger_config: any
  created_at: string
  updated_at: string
  last_run_at: string | null
  run_count: number
  success_count: number
  failure_count: number
  tags: string[]
  category: string | null
  icon: string | null
}

export interface AutomationNode {
  id: string
  automation_id: string
  node_type: 'trigger' | 'action' | 'condition' | 'filter' | 'delay' | 'webhook'
  node_subtype: string | null
  position_x: number
  position_y: number
  title: string | null
  description: string | null
  config: any
  order_index: number
  is_enabled: boolean
  error_handling: any
  created_at: string
  updated_at: string
}

export interface AutomationConnection {
  id: string
  automation_id: string
  source_node_id: string
  target_node_id: string
  condition_type: string | null
  condition_config: any
  order_index: number
  created_at: string
}

export interface MarketplaceAutomation {
  id: string
  automation_id: string
  created_by: string
  title: string
  description: string
  short_description: string | null
  category: string | null
  tags: string[]
  icon: string | null
  preview_image_url: string | null
  is_featured: boolean
  is_verified: boolean
  download_count: number
  like_count: number
  rating_average: number
  rating_count: number
  status: string
  version: string
  pricing_tier: string
  created_at: string
  updated_at: string
  published_at: string | null
  creator?: {
    id: string
    email: string
    full_name: string
  }
}

/**
 * Get automations for current user/space
 */
export async function getAutomations(spaceId?: string): Promise<{ success: boolean; data?: Automation[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    let query = supabase
      .from('automations')
      .select('*')
      .order('created_at', { ascending: false })

    if (spaceId) {
      query = query.eq('space_id', spaceId)
    } else if (currentUser.companyId) {
      query = query.eq('space_id', currentUser.companyId)
    } else {
      query = query.eq('user_id', currentUser.id)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch automations' }
  }
}

/**
 * Get single automation with nodes and connections
 */
export async function getAutomation(automationId: string): Promise<{ success: boolean; data?: Automation & { nodes: AutomationNode[]; connections: AutomationConnection[] }; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get automation
    const { data: automation, error: automationError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automationId)
      .single()

    if (automationError || !automation) {
      return { success: false, error: automationError?.message || 'Automation not found' }
    }

    // Get nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('automation_nodes')
      .select('*')
      .eq('automation_id', automationId)
      .order('order_index', { ascending: true })

    if (nodesError) {
      return { success: false, error: nodesError.message }
    }

    // Get connections
    const { data: connections, error: connectionsError } = await supabase
      .from('automation_connections')
      .select('*')
      .eq('automation_id', automationId)
      .order('order_index', { ascending: true })

    if (connectionsError) {
      return { success: false, error: connectionsError.message }
    }

    return {
      success: true,
      data: {
        ...automation,
        nodes: nodes || [],
        connections: connections || []
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch automation' }
  }
}

/**
 * Create automation
 */
export async function createAutomation(
  name: string,
  description: string,
  triggerType: Automation['trigger_type'],
  triggerConfig: any,
  spaceId?: string
): Promise<{ success: boolean; data?: Automation; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const finalSpaceId = spaceId || currentUser.companyId || null

    const { data, error } = await supabase
      .from('automations')
      .insert({
        space_id: finalSpaceId,
        user_id: currentUser.id,
        name,
        description,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        is_active: false,
        is_public: false,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: 'Failed to create automation' }
  }
}

/**
 * Update automation
 */
export async function updateAutomation(
  automationId: string,
  updates: Partial<Automation>
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('automations')
      .update(updates)
      .eq('id', automationId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update automation' }
  }
}

/**
 * Delete automation
 */
export async function deleteAutomation(automationId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('automations')
      .delete()
      .eq('id', automationId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete automation' }
  }
}

/**
 * Save automation nodes
 */
export async function saveAutomationNodes(
  automationId: string,
  nodes: Omit<AutomationNode, 'id' | 'automation_id' | 'created_at' | 'updated_at'>[]
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Delete existing nodes
    await supabase
      .from('automation_nodes')
      .delete()
      .eq('automation_id', automationId)

    // Insert new nodes
    const nodesToInsert = nodes.map(node => ({
      automation_id: automationId,
      ...node
    }))

    const { error } = await supabase
      .from('automation_nodes')
      .insert(nodesToInsert)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to save nodes' }
  }
}

/**
 * Save automation connections
 */
export async function saveAutomationConnections(
  automationId: string,
  connections: Omit<AutomationConnection, 'id' | 'automation_id' | 'created_at'>[]
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Delete existing connections
    await supabase
      .from('automation_connections')
      .delete()
      .eq('automation_id', automationId)

    // Insert new connections
    const connectionsToInsert = connections.map(conn => ({
      automation_id: automationId,
      ...conn
    }))

    const { error } = await supabase
      .from('automation_connections')
      .insert(connectionsToInsert)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to save connections' }
  }
}

/**
 * Get marketplace automations
 */
export async function getMarketplaceAutomations(filters?: {
  category?: string
  search?: string
  featured?: boolean
}): Promise<{ success: boolean; data?: MarketplaceAutomation[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    let query = supabase
      .from('automation_marketplace')
      .select(`
        *,
        creator:users!automation_marketplace_created_by_fkey(
          id,
          email,
          full_name
        )
      `)
      .eq('status', 'published')
      .order('download_count', { ascending: false })

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.featured) {
      query = query.eq('is_featured', true)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    // Filter by search term if provided
    let filteredData = data || []
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filteredData = filteredData.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
      )
    }

    return { success: true, data: filteredData }
  } catch (error) {
    return { success: false, error: 'Failed to fetch marketplace automations' }
  }
}

/**
 * Like/unlike marketplace automation
 */
export async function toggleAutomationLike(marketplaceId: string): Promise<{ success: boolean; isLiked?: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Check if already liked
    const { data: existing } = await supabase
      .from('automation_likes')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('marketplace_id', marketplaceId)
      .single()

    if (existing) {
      // Unlike
      const { error } = await supabase
        .from('automation_likes')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('marketplace_id', marketplaceId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, isLiked: false }
    } else {
      // Like
      const { error } = await supabase
        .from('automation_likes')
        .insert({
          user_id: currentUser.id,
          marketplace_id: marketplaceId
        })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, isLiked: true }
    }
  } catch (error) {
    return { success: false, error: 'Failed to toggle like' }
  }
}

/**
 * Rate marketplace automation
 */
export async function rateAutomation(
  marketplaceId: string,
  rating: number,
  review?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' }
    }

    const { error } = await supabase
      .from('automation_ratings')
      .upsert({
        user_id: currentUser.id,
        marketplace_id: marketplaceId,
        rating,
        review: review || null
      }, {
        onConflict: 'user_id,marketplace_id'
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to rate automation' }
  }
}

/**
 * Get user's liked automations
 */
export async function getLikedAutomations(): Promise<{ success: boolean; data?: MarketplaceAutomation[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: likes, error: likesError } = await supabase
      .from('automation_likes')
      .select('marketplace_id')
      .eq('user_id', currentUser.id)

    if (likesError) {
      return { success: false, error: likesError.message }
    }

    if (!likes || likes.length === 0) {
      return { success: true, data: [] }
    }

    const marketplaceIds = likes.map(like => like.marketplace_id)

    const { data: automations, error: automationsError } = await supabase
      .from('automation_marketplace')
      .select('*')
      .in('id', marketplaceIds)

    if (automationsError) {
      return { success: false, error: automationsError.message }
    }

    return { success: true, data: automations || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch liked automations' }
  }
}

/**
 * Install automation from marketplace
 */
export async function installMarketplaceAutomation(
  marketplaceId: string,
  spaceId?: string
): Promise<{ success: boolean; data?: Automation; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get marketplace automation
    const { data: marketplaceAutomation, error: marketplaceError } = await supabase
      .from('automation_marketplace')
      .select('*, automations(*)')
      .eq('id', marketplaceId)
      .single()

    if (marketplaceError || !marketplaceAutomation) {
      return { success: false, error: marketplaceError?.message || 'Marketplace automation not found' }
    }

    // Get the source automation
    const sourceAutomation = marketplaceAutomation.automations as any
    if (!sourceAutomation) {
      return { success: false, error: 'Source automation not found' }
    }

    // Get nodes and connections
    const automationResult = await getAutomation(sourceAutomation.id)
    if (!automationResult.success || !automationResult.data) {
      return { success: false, error: 'Failed to fetch automation details' }
    }

    const { nodes, connections } = automationResult.data

    // Create new automation instance
    const finalSpaceId = spaceId || currentUser.companyId || null
    const { data: newAutomation, error: createError } = await supabase
      .from('automations')
      .insert({
        space_id: finalSpaceId,
        user_id: currentUser.id,
        name: `${sourceAutomation.name} (Copy)`,
        description: sourceAutomation.description,
        trigger_type: sourceAutomation.trigger_type,
        trigger_config: sourceAutomation.trigger_config,
        is_active: false,
        is_public: false,
      })
      .select()
      .single()

    if (createError || !newAutomation) {
      return { success: false, error: createError?.message || 'Failed to create automation' }
    }

    // Copy nodes
    if (nodes.length > 0) {
      const nodesToInsert = nodes.map(node => ({
        automation_id: newAutomation.id,
        node_type: node.node_type,
        node_subtype: node.node_subtype,
        position_x: node.position_x,
        position_y: node.position_y,
        title: node.title,
        description: node.description,
        config: node.config,
        order_index: node.order_index,
        is_enabled: node.is_enabled,
        error_handling: node.error_handling,
      }))

      await supabase.from('automation_nodes').insert(nodesToInsert)
    }

    // Copy connections (need to map old node IDs to new ones)
    // For simplicity, we'll skip this for now and let user reconnect

    // Create installation record
    await supabase.from('automation_installations').insert({
      user_id: currentUser.id,
      space_id: finalSpaceId,
      marketplace_id: marketplaceId,
      automation_id: newAutomation.id,
    })

    // Update download count
    await supabase
      .from('automation_marketplace')
      .update({ download_count: (marketplaceAutomation.download_count || 0) + 1 })
      .eq('id', marketplaceId)

    return { success: true, data: newAutomation }
  } catch (error) {
    return { success: false, error: 'Failed to install automation' }
  }
}

