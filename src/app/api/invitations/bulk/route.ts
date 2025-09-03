import { NextRequest, NextResponse } from 'next/server'
import { createBulkUserInvitations } from '@/lib/database-functions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invitations } = body

    if (!invitations || !Array.isArray(invitations) || invitations.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invitations data' },
        { status: 400 }
      )
    }

    // Validate each invitation
    for (const invitation of invitations) {
      if (!invitation.email || !invitation.full_name || !invitation.company_id || !invitation.role || !invitation.invited_by) {
        return NextResponse.json(
          { error: 'Missing required fields in one or more invitations' },
          { status: 400 }
        )
      }
    }

    const result = await createBulkUserInvitations(invitations)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // TODO: Send invitation emails here
    // For now, we'll just return success
    // In production, you'd integrate with an email service like SendGrid, Resend, etc.

    return NextResponse.json({
      success: true,
      message: `${invitations.length} invitations created successfully`,
      invitations: result.data
    })

  } catch (error) {
    console.error('Error creating bulk invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
