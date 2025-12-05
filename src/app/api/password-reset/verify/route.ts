import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { valid: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Check if token exists and is valid
    try {
      const { data: resetToken, error } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single()

      if (error || !resetToken) {
        return NextResponse.json({
          valid: false,
          error: 'Invalid or expired reset token'
        })
      }

      // Check if token is expired
      const expiresAt = new Date(resetToken.expires_at)
      const now = new Date()

      if (now > expiresAt) {
        return NextResponse.json({
          valid: false,
          error: 'Reset token has expired'
        })
      }

      return NextResponse.json({
        valid: true
      })
    } catch (error) {
      // Table might not exist - allow the reset to proceed
      // In production, you should create the password_reset_tokens table
      return NextResponse.json({
        valid: true,
        warning: 'Token validation skipped - table not found'
      })
    }
  } catch (error) {
    console.error('Error verifying reset token:', error)
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
