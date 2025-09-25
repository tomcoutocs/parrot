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
  company_id: string
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
        subject: `Invitation to join ${data.companyName}`,
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

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation to join ${data.companyName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
            <h1 style="color: #2563eb; margin-bottom: 20px;">You're Invited!</h1>
            <p style="font-size: 18px; margin-bottom: 20px;">Hello ${data.recipientName},</p>
            <p style="font-size: 16px; margin-bottom: 30px;">
              ${data.inviterName} has invited you to join <strong>${data.companyName}</strong> as a <strong>${data.role}</strong>.
            </p>
            <a href="${invitationUrl}" 
               style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 20px;">
              Accept Invitation
            </a>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This invitation will expire on ${expiresDate}.<br>
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${invitationUrl}" style="color: #2563eb;">${invitationUrl}</a>
            </p>
          </div>
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
      subject: `Invitation to join ${data.companyName}`,
      html: emailHtml,
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
      subject: `Invitation to join ${data.companyName}`
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
  const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000'
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

