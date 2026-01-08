import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const {
      automationId,
      userId,
      userEmail,
    } = await request.json()

    if (!automationId || !userId || !userEmail) {
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

    // Verify automation belongs to user
    const { data: automation, error: automationError } = await supabase
      .from('automations')
      .select('id, user_id, marketplace_id')
      .eq('id', automationId)
      .eq('user_id', userId)
      .single()

    if (automationError || !automation) {
      return NextResponse.json(
        { success: false, error: 'Automation not found or you do not have permission to unshare this automation' },
        { status: 404 }
      )
    }

    if (!automation.marketplace_id) {
      return NextResponse.json(
        { success: false, error: 'This automation is not currently shared to the marketplace' },
        { status: 400 }
      )
    }

    // Update marketplace status to 'archived' (soft delete)
    const { error: updateError } = await supabase
      .from('automation_marketplace')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', automation.marketplace_id)

    if (updateError) {
      console.error('Error archiving marketplace entry:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to remove automation from marketplace' },
        { status: 500 }
      )
    }

    // Update the automation's is_public flag and remove marketplace_id link
    const { error: automationUpdateError } = await supabase
      .from('automations')
      .update({
        is_public: false,
        marketplace_id: null,
      })
      .eq('id', automationId)

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

