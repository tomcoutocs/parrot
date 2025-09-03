import { NextRequest, NextResponse } from 'next/server'
import { createUserInvitation, createBulkUserInvitations } from '@/lib/database-functions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, full_name, company_id, role, invited_by, tab_permissions } = body

    if (!email || !full_name || !company_id || !role || !invited_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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

    // TODO: Send invitation email here
    // For now, we'll just return success
    // In production, you'd integrate with an email service like SendGrid, Resend, etc.

    return NextResponse.json({
      success: true,
      message: 'Invitation created successfully',
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
