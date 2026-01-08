import { NextRequest, NextResponse } from 'next/server'
import { sendSupportTicketEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const {
      recipientName,
      recipientEmail,
      ticketId,
      ticketSubject,
      ticketDescription,
      ticketStatus,
      ticketPriority,
      resolvedAt,
    } = await request.json()

    if (!recipientEmail || !ticketId || !ticketSubject) {
      return NextResponse.json(
        { success: false, error: 'Email address, ticket ID, and subject are required' },
        { status: 400 }
      )
    }

    if (ticketStatus !== 'resolved' && ticketStatus !== 'closed') {
      return NextResponse.json(
        { success: false, error: 'Email notifications are only sent for resolved or closed tickets' },
        { status: 400 }
      )
    }

    const result = await sendSupportTicketEmail({
      recipientName: recipientName || 'User',
      recipientEmail,
      ticketId,
      ticketSubject,
      ticketDescription: ticketDescription || '',
      ticketStatus,
      ticketPriority: ticketPriority || 'normal',
      resolvedAt: resolvedAt || new Date().toISOString(),
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
    console.error('Error sending support ticket email:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

