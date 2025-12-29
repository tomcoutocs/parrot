import { NextRequest, NextResponse } from 'next/server'
import { createUserInvitation } from '@/lib/database-functions'
import { sendInvitationEmail } from '@/lib/email'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, full_name, company_id, role, invited_by, tab_permissions, company_name, inviter_name } = body

    if (!email || !full_name || !role || !invited_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    // company_id can be null for internal/admin users

    const result = await createUserInvitation({
      email,
      full_name,
      company_id,
      role,
      invited_by,
      tab_permissions
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Send invitation email
    if (result.data) {
      const emailResult = await sendInvitationEmail({
        recipientName: full_name,
        recipientEmail: email,
        companyName: company_name || 'Your Company',
        invitationToken: result.data.invitation_token,
        inviterName: inviter_name || 'Your Administrator',
        role: role,
        expiresAt: result.data.expires_at
      })

      if (!emailResult.success) {
        console.warn('Failed to send invitation email:', emailResult.error)
        // Don't fail the whole operation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation created and email sent successfully',
      invitation: result.data
    })

  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
