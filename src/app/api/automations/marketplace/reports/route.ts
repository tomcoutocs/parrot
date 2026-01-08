import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userEmail = searchParams.get('userEmail')
    const status = searchParams.get('status') || 'all'

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

    // Build query
    let query = supabase
      .from('automation_reports')
      .select(`
        *,
        marketplace:automation_marketplace(
          id,
          title,
          short_description,
          automation_id
        ),
        reporter:users!automation_reports_reported_by_fkey(
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by status if specified
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: reports, error: reportsError } = await query

    if (reportsError) {
      console.error('Error fetching reports:', reportsError)
      return NextResponse.json(
        { success: false, error: reportsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: reports || []
    })
  } catch (error) {
    console.error('Error fetching automation reports:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const {
      reportId,
      status,
      userId,
      userEmail,
    } = await request.json()

    if (!reportId || !status || !userId || !userEmail) {
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

    // Update report status
    const { data: updatedReport, error: updateError } = await supabase
      .from('automation_reports')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      })
      .eq('id', reportId)
      .select()
      .single()

    if (updateError || !updatedReport) {
      console.error('Error updating report:', updateError)
      return NextResponse.json(
        { success: false, error: updateError?.message || 'Failed to update report' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedReport
    })
  } catch (error) {
    console.error('Error updating automation report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update report' },
      { status: 500 }
    )
  }
}

