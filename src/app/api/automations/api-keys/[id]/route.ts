import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!id || !userId) {
      return NextResponse.json(
        { success: false, error: 'ID and user ID are required' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 })
    }

    const { error } = await supabase
      .from('automation_api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API key delete error:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete API key' }, { status: 500 })
  }
}
