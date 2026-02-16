import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/automations/webhooks/generate
 * Body: { automationId, userId }
 * Generates a webhook_token for an automation with trigger_type='webhook' if it doesn't have one.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { automationId, userId } = body

    if (!automationId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Automation ID and user ID are required' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 })
    }

    const { data: automation, error: fetchError } = await supabase
      .from('automations')
      .select('id, trigger_type, trigger_config, user_id')
      .eq('id', automationId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !automation) {
      return NextResponse.json({ success: false, error: 'Automation not found' }, { status: 404 })
    }

    if (automation.trigger_type !== 'webhook') {
      return NextResponse.json(
        { success: false, error: 'Automation must have webhook trigger type' },
        { status: 400 }
      )
    }

    const currentConfig = (automation.trigger_config as Record<string, unknown>) || {}
    const existingToken = currentConfig.webhook_token as string | undefined

    if (existingToken) {
      return NextResponse.json({
        success: true,
        url: `${request.nextUrl.origin}/api/automations/webhook/${existingToken}`,
        token: existingToken,
      })
    }

    const newToken = crypto.randomUUID()
    const updatedConfig = { ...currentConfig, webhook_token: newToken }

    const { error: updateError } = await supabase
      .from('automations')
      .update({ trigger_config: updatedConfig })
      .eq('id', automationId)
      .eq('user_id', userId)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      url: `${request.nextUrl.origin}/api/automations/webhook/${newToken}`,
      token: newToken,
    })
  } catch (error) {
    console.error('Webhook token generate error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate webhook URL' }, { status: 500 })
  }
}
