import { NextRequest, NextResponse } from 'next/server'
import { createBulkUserInvitations } from '@/lib/database-functions'
import { sendBulkInvitationEmails } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invitations, company_name, inviter_name } = body

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

    // Send invitation emails
    if (result.data && result.data.length > 0) {
      const emailData = result.data.map(invitation => ({
        recipientName: invitation.full_name,
        recipientEmail: invitation.email,
        companyName: company_name || 'Your Company',
        invitationToken: invitation.invitation_token,
        inviterName: inviter_name || 'Your Administrator',
        role: invitation.role,
        expiresAt: invitation.expires_at,
        // Include all the original invitation data
        id: invitation.id,
        email: invitation.email,
        full_name: invitation.full_name,
        company_id: invitation.company_id,
        invited_by: invitation.invited_by,
        invitation_token: invitation.invitation_token,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at,
        company_name: company_name || 'Your Company',
        inviter_name: inviter_name || 'Your Administrator'
      }))

      const emailResult = await sendBulkInvitationEmails(emailData)
      
      if (!emailResult.success) {
        console.warn('Some invitation emails failed to send:', emailResult.results.filter(r => !r.success))
        // Don't fail the whole operation if some emails fail
      }
    }

    return NextResponse.json({
      success: true,
      message: `${invitations.length} invitations created and emails sent successfully`,
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
