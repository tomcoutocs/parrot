import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const automationId = searchParams.get('automationId')
    const userId = searchParams.get('userId')
    const userEmail = searchParams.get('userEmail')

    if (!automationId) {
      return NextResponse.json(
        { success: false, error: 'Automation ID is required' },
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

    // Get automation to check marketplace_id (must belong to user)
    const { data: automation, error: automationError } = await supabase
      .from('automations')
      .select('marketplace_id')
      .eq('id', automationId)
      .eq('user_id', userId)
      .single()

    if (automationError || !automation) {
      return NextResponse.json(
        { success: false, error: 'Automation not found or access denied' },
        { status: 404 }
      )
    }

    if (!automation.marketplace_id) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    // Get marketplace entry
    const { data: marketplace, error: marketplaceError } = await supabase
      .from('automation_marketplace')
      .select('*')
      .eq('id', automation.marketplace_id)
      .single()

    if (marketplaceError || !marketplace) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    return NextResponse.json({
      success: true,
      data: marketplace
    })
  } catch (error) {
    console.error('Error fetching marketplace data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch marketplace data' },
      { status: 500 }
    )
  }
}

