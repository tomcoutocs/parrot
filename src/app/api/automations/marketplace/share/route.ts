import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const {
      automationId,
      title,
      description,
      shortDescription,
      category,
      tags,
      pricingTier,
      userId,
      userEmail,
    } = await request.json()

    if (!automationId || !title || !description) {
      return NextResponse.json(
        { success: false, error: 'Automation ID, title, and description are required' },
        { status: 400 }
      )
    }

    if (!userId || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'User authentication required' },
        { status: 401 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Verify user exists and is active
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, is_active')
      .eq('id', userId)
      .eq('email', userEmail)
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    // Verify automation exists and belongs to user (all users can share their own automations)
    const { data: automation, error: automationError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automationId)
      .eq('user_id', userId)
      .single()

    if (automationError || !automation) {
      return NextResponse.json(
        { success: false, error: 'Automation not found or you do not have permission to share this automation' },
        { status: 404 }
      )
    }

    // Check if already shared
    let marketplaceEntry
    if (automation.marketplace_id) {
      const { data: existing } = await supabase
        .from('automation_marketplace')
        .select('*')
        .eq('id', automation.marketplace_id)
        .single()

      if (existing) {
        marketplaceEntry = existing
      }
    }

    const tagsArray = tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []

    if (marketplaceEntry) {
      // Update existing marketplace entry
      const { error: updateError } = await supabase
        .from('automation_marketplace')
        .update({
          title,
          description,
          short_description: shortDescription || description.substring(0, 500),
          category: category || null,
          tags: tagsArray,
          pricing_tier: pricingTier || 'free',
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', marketplaceEntry.id)

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        )
      }
    } else {
      // Create new marketplace entry
      const { data: newEntry, error: createError } = await supabase
        .from('automation_marketplace')
        .insert({
          automation_id: automationId,
          created_by: userId,
          title,
          description,
          short_description: shortDescription || description.substring(0, 500),
          category: category || null,
          tags: tagsArray,
          pricing_tier: pricingTier || 'free',
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError || !newEntry) {
        return NextResponse.json(
          { success: false, error: createError?.message || 'Failed to create marketplace entry' },
          { status: 500 }
        )
      }

      // Update automation to link to marketplace
      await supabase
        .from('automations')
        .update({
          marketplace_id: newEntry.id,
          is_public: true,
        })
        .eq('id', automationId)

      marketplaceEntry = newEntry
    }

    return NextResponse.json({
      success: true,
      data: marketplaceEntry
    })
  } catch (error) {
    console.error('Error sharing automation to marketplace:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to share automation' },
      { status: 500 }
    )
  }
}

