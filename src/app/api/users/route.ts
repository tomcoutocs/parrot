import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/database-functions'
import { sendWelcomeEmail } from '@/lib/email'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, 
      full_name, 
      role, 
      password, 
      assigned_manager_id, 
      company_id, 
      tab_permissions,
      company_ids,
      primary_company_id
    } = body

    if (!email || !full_name || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create the user
    const result = await createUser({
      email,
      full_name,
      role,
      password,
      assigned_manager_id,
      company_id,
      tab_permissions,
      company_ids,
      primary_company_id
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Send welcome email to the new user (server-side)
    if (result.data) {
      try {
        // Get company name if company_id is provided
        let companyName: string | undefined
        if (result.data.company_id && supabase) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', result.data.company_id)
            .single()
          
          if (company) {
            companyName = company.name
          }
        }

        // Generate login URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const loginUrl = `${baseUrl}/auth/signin`

        // Send welcome email
        const emailResult = await sendWelcomeEmail({
          recipientName: result.data.full_name,
          recipientEmail: result.data.email,
          password: password, // Send the plain password
          companyName: companyName,
          role: result.data.role,
          loginUrl: loginUrl
        })

        if (!emailResult.success) {
          console.warn('Failed to send welcome email:', emailResult.error)
          // Don't fail the whole operation if email fails
        } else {
          console.log('Welcome email sent successfully to:', result.data.email)
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError)
        // Don't fail the whole operation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User created and welcome email sent successfully',
      user: result.data
    })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

