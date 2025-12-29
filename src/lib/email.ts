// Email functionality for sending invitations using Resend
import { Resend } from 'resend'

// Initialize Resend with error handling
let resend: Resend | null = null

try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
} catch (error) {
  console.warn('Failed to initialize Resend client:', error)
}

export interface InvitationEmailData {
  recipientName: string
  recipientEmail: string
  companyName: string
  invitationToken: string
  inviterName: string
  role: string
  expiresAt: string
}

export interface BulkInvitationEmailData extends InvitationEmailData {
  id: string
  email: string
  full_name: string
  company_id: string | null
  role: string
  invited_by: string
  invitation_token: string
  expires_at: string
  created_at: string
  company_name: string
  inviter_name: string
}

export interface EmailResult {
  success: boolean
  error?: string
}

export interface BulkEmailResult {
  success: boolean
  results: Array<{ success: boolean; email: string; error?: string }>
}

export interface WelcomeEmailData {
  recipientName: string
  recipientEmail: string
  password: string
  companyName?: string
  role: string
  loginUrl: string
}

// Email sending function for single invitation using Resend
export async function sendInvitationEmail(data: InvitationEmailData): Promise<EmailResult> {
  try {
    console.log('🔍 Email sending debug info:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
      recipientEmail: data.recipientEmail,
      companyName: data.companyName
    })

    if (!process.env.RESEND_API_KEY || !resend) {
      console.warn('⚠️ RESEND_API_KEY not configured or Resend client not initialized, falling back to mock email')
      console.log('📧 Mock email sent:', {
        to: data.recipientEmail,
        subject: `Parrot portal invites you to join ${data.companyName}`,
        recipientName: data.recipientName,
        companyName: data.companyName,
        inviterName: data.inviterName,
        role: data.role,
        invitationToken: data.invitationToken,
        expiresAt: data.expiresAt
      })
      return { success: true }
    }

    const invitationUrl = generateInvitationUrl(data.invitationToken)
    const expiresDate = new Date(data.expiresAt).toLocaleDateString()

    // Plain text version for better deliverability
    const emailText = `Hello ${data.recipientName},

${data.inviterName} has invited you to join ${data.companyName} as a ${data.role}.

Accept your invitation by clicking the link below:
${invitationUrl}

This invitation will expire on ${expiresDate}.

If you have any questions, please contact ${data.inviterName}.

Best regards,
The Parrot Portal Team`

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Parrot portal invites you to join ${data.companyName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4; margin: 0; padding: 0;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 30px; text-align: center;">
                      <h1 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">You're Invited!</h1>
                      <p style="font-size: 16px; margin: 0 0 20px 0; color: #333333;">Hello ${data.recipientName},</p>
                      <p style="font-size: 16px; margin: 0 0 30px 0; color: #666666;">
                        ${data.inviterName} has invited you to join <strong style="color: #333333;">${data.companyName}</strong> as a <strong style="color: #333333;">${data.role}</strong>.
            </p>
                      <table role="presentation" style="margin: 0 auto;">
                        <tr>
                          <td>
            <a href="${invitationUrl}" 
                               style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
              Accept Invitation
            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="font-size: 14px; color: #666666; margin: 30px 0 0 0; line-height: 1.6;">
              This invitation will expire on ${expiresDate}.<br>
              If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${invitationUrl}" style="color: #2563eb; word-break: break-all; text-decoration: underline;">${invitationUrl}</a>
            </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `

    // Check if we have a valid from email configured
    const fromEmail = process.env.FROM_EMAIL
    console.log('🔍 Environment variables debug:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
      hasFromEmail: !!process.env.FROM_EMAIL,
      fromEmailValue: process.env.FROM_EMAIL,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('RESEND') || key.includes('FROM_EMAIL'))
    })
    
    if (!fromEmail) {
      console.error('❌ FROM_EMAIL not configured. Please set a verified domain email.')
      return {
        success: false,
        error: 'Email configuration error: FROM_EMAIL not set'
      }
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to: [data.recipientEmail],
      subject: `Parrot portal invites you to join ${data.companyName}`,
      html: emailHtml,
      text: emailText,
      headers: {
        'X-Entity-Ref-ID': data.invitationToken.substring(0, 20), // Unique identifier for tracking
      },
    })

    if (result.error) {
      console.error('Resend API error:', result.error)
      
      // Handle specific domain verification errors
      if (result.error.message?.includes('domain is not verified')) {
        return {
          success: false,
          error: 'Domain verification error: Please verify your domain in Resend dashboard'
        }
      }
      
      return {
        success: false,
        error: result.error.message || 'Failed to send email'
      }
    }

    console.log('📧 Email sent successfully via Resend:', {
      id: result.data?.id,
      to: data.recipientEmail,
      subject: `Parrot portal invites you to join ${data.companyName}`
    })

    return {
      success: true
    }
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Email sending function for bulk invitations using Resend
export async function sendBulkInvitationEmails(data: BulkInvitationEmailData[]): Promise<BulkEmailResult> {
  const results: Array<{ success: boolean; email: string; error?: string }> = []

  try {
    for (const invitation of data) {
      try {
        const emailResult = await sendInvitationEmail({
          recipientName: invitation.full_name,
          recipientEmail: invitation.email,
          companyName: invitation.company_name,
          invitationToken: invitation.invitation_token,
          inviterName: invitation.inviter_name,
          role: invitation.role,
          expiresAt: invitation.expires_at
        })

        results.push({
          success: emailResult.success,
          email: invitation.email,
          error: emailResult.error
        })
      } catch (error) {
        console.error(`Failed to send email to ${invitation.email}:`, error)
        results.push({
          success: false,
          email: invitation.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const allSuccessful = results.every(r => r.success)
    
    return {
      success: allSuccessful,
      results
    }
  } catch (error) {
    console.error('Failed to send bulk invitation emails:', error)
    return {
      success: false,
      results: data.map(invitation => ({
        success: false,
        email: invitation.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }
}

// Helper function to generate invitation URL
export function generateInvitationUrl(token: string, baseUrl?: string): string {
  // Use NEXT_PUBLIC_APP_URL for production, fallback to NEXTAUTH_URL, then localhost
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${base}/invite/${token}`
}

// Helper function to format expiration date
export function formatExpirationDate(expiresAt: string): string {
  try {
    const date = new Date(expiresAt)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Failed to format expiration date:', error)
    return 'Unknown'
  }
}

// Email sending function for welcome emails when users are created directly
export interface PasswordResetEmailData {
  recipientName: string
  recipientEmail: string
  resetToken: string
  expiresAt: string
}

// Email sending function for password reset
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<EmailResult> {
  try {
    if (!process.env.RESEND_API_KEY || !resend) {
      console.warn('⚠️ RESEND_API_KEY not configured, falling back to mock email')
      console.log('📧 Mock password reset email sent:', {
        to: data.recipientEmail,
        resetToken: data.resetToken
      })
      return { success: true }
    }

    const resetUrl = generatePasswordResetUrl(data.resetToken)
    const expiresDate = new Date(data.expiresAt).toLocaleDateString()

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
            <h1 style="color: #2563eb; margin-bottom: 20px;">Reset Your Password</h1>
            <p style="font-size: 18px; margin-bottom: 20px;">Hello ${data.recipientName},</p>
            <p style="font-size: 16px; margin-bottom: 30px;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>
            <a href="${resetUrl}" 
               style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 20px;">
              Reset Password
            </a>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This link will expire on ${expiresDate}.<br>
              If you didn't request a password reset, you can safely ignore this email.<br><br>
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `

    const emailText = `Hello ${data.recipientName},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire on ${expiresDate}.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
The Parrot Team`

    const fromEmail = process.env.FROM_EMAIL
    
    if (!fromEmail) {
      console.error('❌ FROM_EMAIL not configured.')
      return {
        success: false,
        error: 'Email configuration error: FROM_EMAIL not set'
      }
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to: [data.recipientEmail],
      subject: 'Reset Your Password',
      html: emailHtml,
      text: emailText,
      headers: {
        'X-Entity-Ref-ID': data.resetToken.substring(0, 20), // Unique identifier for tracking
      },
    })

    if (result.error) {
      console.error('Resend API error:', result.error)
      
      if (result.error.message?.includes('domain is not verified')) {
        return {
          success: false,
          error: 'Domain verification error: Please verify your domain in Resend dashboard'
        }
      }
      
      return {
        success: false,
        error: result.error.message || 'Failed to send email'
      }
    }

    console.log('📧 Password reset email sent successfully via Resend:', {
      id: result.data?.id,
      to: data.recipientEmail
    })

    return {
      success: true
    }
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Helper function to generate password reset URL
export function generatePasswordResetUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `${base}/auth/reset-password?token=${token}`
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult> {
  try {
    console.log('🔍 Welcome email sending debug info:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
      recipientEmail: data.recipientEmail,
      companyName: data.companyName
    })

    if (!process.env.RESEND_API_KEY || !resend) {
      console.warn('⚠️ RESEND_API_KEY not configured or Resend client not initialized, falling back to mock email')
      console.log('📧 Mock welcome email sent:', {
        to: data.recipientEmail,
        subject: `Welcome to ${data.companyName || 'Parrot'}`,
        recipientName: data.recipientName,
        companyName: data.companyName,
        role: data.role
      })
      return { success: true }
    }

    const companyText = data.companyName ? ` at <strong>${data.companyName}</strong>` : ''
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${data.companyName || 'Parrot'}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
            <h1 style="color: #2563eb; margin-bottom: 20px;">Welcome!</h1>
            <p style="font-size: 18px; margin-bottom: 20px;">Hello ${data.recipientName},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              Your account has been created${companyText} as a <strong>${data.role}</strong>.
            </p>
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: left;">
              <p style="font-size: 14px; margin-bottom: 10px; color: #666;"><strong>Your login credentials:</strong></p>
              <p style="font-size: 14px; margin-bottom: 5px;"><strong>Email:</strong> ${data.recipientEmail}</p>
              <p style="font-size: 14px; margin-bottom: 15px;"><strong>Password:</strong> ${data.password}</p>
              <p style="font-size: 12px; color: #999; font-style: italic;">Please change your password after your first login for security.</p>
            </div>
            <a href="${data.loginUrl}" 
               style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 20px;">
              Sign In Now
            </a>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${data.loginUrl}" style="color: #2563eb;">${data.loginUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `

    const emailText = `Welcome to ${data.companyName || 'Parrot'}!

Hello ${data.recipientName},

Your account has been created${data.companyName ? ` at ${data.companyName}` : ''} as a ${data.role}.

Your login credentials:
Email: ${data.recipientEmail}
Password: ${data.password}

Please change your password after your first login for security.

Sign in here: ${data.loginUrl}

Best regards,
The Parrot Team`

    // Check if we have a valid from email configured
    const fromEmail = process.env.FROM_EMAIL
    
    if (!fromEmail) {
      console.error('❌ FROM_EMAIL not configured. Please set a verified domain email.')
      return {
        success: false,
        error: 'Email configuration error: FROM_EMAIL not set'
      }
    }

    const result = await resend.emails.send({
      from: fromEmail,
      to: [data.recipientEmail],
      subject: `Welcome to ${data.companyName || 'Parrot'}`,
      html: emailHtml,
      text: emailText,
    })

    if (result.error) {
      console.error('Resend API error:', result.error)
      
      // Handle specific domain verification errors
      if (result.error.message?.includes('domain is not verified')) {
        return {
          success: false,
          error: 'Domain verification error: Please verify your domain in Resend dashboard'
        }
      }
      
      return {
        success: false,
        error: result.error.message || 'Failed to send email'
      }
    }

    console.log('📧 Welcome email sent successfully via Resend:', {
      id: result.data?.id,
      to: data.recipientEmail,
      subject: `Welcome to ${data.companyName || 'Parrot'}`
    })

    return {
      success: true
    }
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

