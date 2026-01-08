import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { resendInvitation } from '@/lib/database-functions'
import { sendInvitationEmail } from '@/lib/email'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { invitation_id, company_name, inviter_name } = body

    if (!invitation_id) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    // Resend the invitation (updates token and expiry)
    const result = await resendInvitation(invitation_id)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to resend invitation' },
        { status: 500 }
      )
    }

    // Get inviter name and company name if not provided
    let inviterName = inviter_name || 'Administrator'
    let companyName = company_name || 'Your Company'

    if (!inviter_name && currentUser.id && supabase) {
      const { data: inviter } = await supabase
        .from('users')
        .select('name')
        .eq('id', currentUser.id)
        .single()
      if (inviter?.name) {
        inviterName = inviter.name
      }
    }

    if (!company_name && result.data.space_id && supabase) {
      const { data: space } = await supabase
        .from('spaces')
        .select('name')
        .eq('id', result.data.space_id)
        .single()
      if (space?.name) {
        companyName = space.name
      }
    }

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      recipientName: result.data.full_name,
      recipientEmail: result.data.email,
      companyName: companyName,
      invitationToken: result.data.invitation_token,
      inviterName: inviterName,
      role: result.data.role,
      expiresAt: result.data.expires_at
    })

    if (!emailResult.success) {
      console.warn('Failed to send invitation email:', emailResult.error)
      // Still return success since invitation was updated, but log the email failure
      return NextResponse.json({
        success: true,
        message: 'Invitation updated but email failed to send',
        warning: emailResult.error,
        invitation: result.data
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      invitation: result.data
    })

  } catch (error) {
    console.error('Error resending invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

