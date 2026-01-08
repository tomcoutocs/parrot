import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const {
      marketplaceId,
      userId,
      userEmail,
    } = await request.json()

    if (!marketplaceId || !userId || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Verify user exists and is system admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, is_active')
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

    // Check if user is system admin
    if (user.role !== 'system_admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - System admin access required' },
        { status: 403 }
      )
    }

    // Get marketplace entry to find associated automation
    const { data: marketplace, error: marketplaceError } = await supabase
      .from('automation_marketplace')
      .select('automation_id')
      .eq('id', marketplaceId)
      .single()

    if (marketplaceError || !marketplace) {
      return NextResponse.json(
        { success: false, error: 'Marketplace entry not found' },
        { status: 404 }
      )
    }

    // Update marketplace status to 'archived' (soft delete)
    const { error: updateError } = await supabase
      .from('automation_marketplace')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', marketplaceId)

    if (updateError) {
      console.error('Error archiving marketplace entry:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to remove automation from marketplace' },
        { status: 500 }
      )
    }

    // Also update the automation's is_public flag and remove marketplace_id link
    const { error: automationUpdateError } = await supabase
      .from('automations')
      .update({
        is_public: false,
        marketplace_id: null,
      })
      .eq('id', marketplace.automation_id)

    if (automationUpdateError) {
      console.error('Error updating automation:', automationUpdateError)
      // Don't fail the request if this update fails, the marketplace entry is already archived
    }

    return NextResponse.json({
      success: true,
      message: 'Automation removed from marketplace successfully'
    })
  } catch (error) {
    console.error('Error removing automation from marketplace:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove automation from marketplace' },
      { status: 500 }
    )
  }
}

