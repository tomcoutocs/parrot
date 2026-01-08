import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const {
      marketplaceId,
      reason,
      userId,
      userEmail,
    } = await request.json()

    if (!marketplaceId || !reason || !userId || !userEmail) {
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

    // Verify marketplace entry exists
    const { data: marketplace, error: marketplaceError } = await supabase
      .from('automation_marketplace')
      .select('id, automation_id')
      .eq('id', marketplaceId)
      .single()

    if (marketplaceError || !marketplace) {
      return NextResponse.json(
        { success: false, error: 'Automation not found' },
        { status: 404 }
      )
    }

    // Check if user has already reported this automation
    const { data: existingReport } = await supabase
      .from('automation_reports')
      .select('id')
      .eq('marketplace_id', marketplaceId)
      .eq('reported_by', userId)
      .single()

    if (existingReport) {
      return NextResponse.json(
        { success: false, error: 'You have already reported this automation' },
        { status: 400 }
      )
    }

    // Create report
    const { data: report, error: reportError } = await supabase
      .from('automation_reports')
      .insert({
        marketplace_id: marketplaceId,
        automation_id: marketplace.automation_id,
        reported_by: userId,
        reason: reason.trim(),
        status: 'pending',
      })
      .select()
      .single()

    if (reportError || !report) {
      console.error('Error creating report:', reportError)
      return NextResponse.json(
        { success: false, error: reportError?.message || 'Failed to create report' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Error reporting automation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to report automation' },
      { status: 500 }
    )
  }
}

