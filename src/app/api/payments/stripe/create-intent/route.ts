import { NextRequest, NextResponse } from 'next/server'
import { getInvoice } from '@/lib/invoicing-functions'

// Stripe integration for payment processing
// Note: Install stripe package: npm install stripe
// Set STRIPE_SECRET_KEY in environment variables

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, amount } = await request.json()

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    // Get invoice
    const invoiceResult = await getInvoice(invoiceId)
    if (!invoiceResult.success || !invoiceResult.data) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoice = invoiceResult.data
    const paymentAmount = amount || invoice.total_amount

    // Check if Stripe is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      )
    }

    // Dynamic import of Stripe (only if configured)
    const stripe = (await import('stripe')).default
    const stripeClient = new stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
    })

    // Create payment intent
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(paymentAmount * 100), // Convert to cents
      currency: invoice.currency.toLowerCase(),
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        space_id: invoice.space_id || '',
      },
      description: `Payment for invoice ${invoice.invoice_number}`,
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}

