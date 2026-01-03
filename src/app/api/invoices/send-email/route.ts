import { NextRequest, NextResponse } from 'next/server'
import { sendInvoiceEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, to, clientName, invoiceNumber, amount, currency, hostedLink } = await request.json()

    if (!to || !invoiceId) {
      return NextResponse.json(
        { success: false, error: 'Email address and invoice ID are required' },
        { status: 400 }
      )
    }

    const result = await sendInvoiceEmail({
      to,
      clientName: clientName || 'Client',
      invoiceNumber,
      amount,
      currency: currency || 'USD',
      hostedLink,
    })

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending invoice email:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

