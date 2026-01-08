import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { headers } from 'next/headers'

// Stripe webhook handler for payment events
// Configure webhook URL in Stripe dashboard: https://yourdomain.com/api/payments/stripe/webhook
// Set STRIPE_WEBHOOK_SECRET in environment variables

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Dynamic import of Stripe
    let stripe: any
    try {
      stripe = (await import('stripe')).default
    } catch (error) {
      return NextResponse.json(
        { error: 'Stripe package not installed. Please run: npm install stripe' },
        { status: 500 }
      )
    }
    
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-12-15.clover',
    })

    let event
    try {
      event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle different event types
    const eventType = event.type as string
    
    if (eventType === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any
      const invoiceId = paymentIntent.metadata?.invoice_id

      if (invoiceId && supabase) {
        // Create payment record
        await supabase.from('payments').insert({
          invoice_id: invoiceId,
          space_id: paymentIntent.metadata?.space_id || null,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency.toUpperCase(),
          payment_method: 'stripe',
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: paymentIntent.latest_charge,
          stripe_status: paymentIntent.status,
          status: 'completed',
          processed_at: new Date().toISOString(),
          payout_eligible: true,
          payout_eligible_date: new Date().toISOString(),
        })

        // Update invoice status
        await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_amount: paymentIntent.amount / 100,
            paid_at: new Date().toISOString(),
          })
          .eq('id', invoiceId)
      }
    } else if (eventType === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as any
      const invoiceId = paymentIntent.metadata?.invoice_id

      if (invoiceId && supabase) {
        await supabase.from('payments').insert({
          invoice_id: invoiceId,
          space_id: paymentIntent.metadata?.space_id || null,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency.toUpperCase(),
          payment_method: 'stripe',
          stripe_payment_intent_id: paymentIntent.id,
          stripe_status: paymentIntent.status,
          status: 'failed',
          failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
        })
      }
    } else if (eventType === 'charge.held') {
      // Payment is being held for review
      const charge = event.data.object as any
      const paymentIntentId = charge.payment_intent

      if (paymentIntentId && supabase) {
        await supabase
          .from('payments')
          .update({
            is_held: true,
            hold_reason: 'Manual review required',
            manual_review_required: true,
            review_status: 'pending',
          })
          .eq('stripe_payment_intent_id', paymentIntentId)
      }
    } else if (eventType === 'charge.refunded') {
      const charge = event.data.object as any
      const paymentIntentId = charge.payment_intent

      if (paymentIntentId && supabase) {
        await supabase
          .from('payments')
          .update({
            status: charge.refunded ? 'refunded' : 'partially_refunded',
          })
          .eq('stripe_payment_intent_id', paymentIntentId)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

