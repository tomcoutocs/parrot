import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/encryption'

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
      .from('automation_api_keys')
      .select('id, name, created_at')
      .eq('user_id', userId)

    if (spaceId) {
      query = query.or(`space_id.eq.${spaceId},space_id.is.null`)
    } else {
      query = query.is('space_id', null)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('API keys list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, spaceId, name, key } = body

    if (!userId || !name || !key) {
      return NextResponse.json(
        { success: false, error: 'User ID, name, and key are required' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 })
    }

    const keyEncrypted = await encrypt(key.trim())
    if (!keyEncrypted) {
      return NextResponse.json({ success: false, error: 'Failed to encrypt key' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('automation_api_keys')
      .insert({
        user_id: userId,
        space_id: spaceId || null,
        name: name.trim(),
        key_encrypted: keyEncrypted,
      })
      .select('id, name')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'An API key with this name already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { id: data?.id, name: data?.name } })
  } catch (error) {
    console.error('API key create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save API key' }, { status: 500 })
  }
}
