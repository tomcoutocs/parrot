import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Webhook endpoint for triggering automations.
 * External services can POST to: /api/automations/webhook/[token]
 * The token is stored in the automation's trigger_config when it has trigger_type='webhook'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json({ success: false, error: 'Webhook token is required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Webhook service unavailable' }, { status: 503 })
    }

    // Find automation with this webhook token
    const { data: automations, error: findError } = await supabase
      .from('automations')
      .select('id, name, user_id, space_id, trigger_config, nodes:automation_nodes(*), connections:automation_connections(*)')
      .eq('trigger_type', 'webhook')
      .eq('is_active', true)

    if (findError) {
      return NextResponse.json({ success: false, error: 'Failed to lookup webhook' }, { status: 500 })
    }

    const automation = (automations || []).find(
      (a) => (a.trigger_config as { webhook_token?: string } | null)?.webhook_token === token
    )

    if (!automation) {
      return NextResponse.json({ success: false, error: 'Webhook not found or automation inactive' }, { status: 404 })
    }
    let triggerData: Record<string, unknown> = {}

    try {
      const contentType = request.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        triggerData = await request.json()
      } else {
        const text = await request.text()
        if (text) {
          try {
            triggerData = { raw: text, headers: Object.fromEntries(request.headers.entries()) }
          } catch {
            triggerData = { raw: text }
          }
        }
      }
    } catch {
      triggerData = { timestamp: new Date().toISOString() }
    }

    // Add webhook metadata
    triggerData = {
      ...triggerData,
      _webhook: {
        received_at: new Date().toISOString(),
        method: request.method,
      },
    }

    // Call the execute API internally (we need to run the workflow)
    const baseUrl = request.nextUrl.origin
    const executeResponse = await fetch(`${baseUrl}/api/automations/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        automationId: automation.id,
        triggerData,
        webhookTrigger: true,
      }),
    })

    const result = await executeResponse.json()

    if (!executeResponse.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'Automation execution failed' },
        { status: executeResponse.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook received and automation triggered',
      executionId: result.executionId,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
