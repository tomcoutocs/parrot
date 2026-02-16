import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const spaceId = searchParams.get('spaceId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 })
    }

    let query = supabase
      .from('automations')
      .select('id, name, trigger_config, is_active, created_at')
      .eq('trigger_type', 'webhook')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (spaceId) {
      query = query.eq('space_id', spaceId)
    } else {
      query = query.is('space_id', null)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const webhooks = (data || []).map((a: { id: string; name: string; trigger_config?: { webhook_token?: string }; is_active: boolean; created_at: string }) => {
      const token = a.trigger_config?.webhook_token
      return {
        id: a.id,
        name: a.name,
        url: token ? `${request.nextUrl.origin}/api/automations/webhook/${token}` : null,
        hasToken: !!token,
        isActive: a.is_active,
        createdAt: a.created_at,
      }
    })

    return NextResponse.json({ success: true, data: webhooks })
  } catch (error) {
    console.error('Webhooks list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch webhooks' }, { status: 500 })
  }
}
