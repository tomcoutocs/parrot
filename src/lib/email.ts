// Email utility functions for sending invitations
// This uses Resend API for email delivery

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

interface InvitationEmailData {
  recipientName: string
  recipientEmail: string
  companyName: string
  invitationToken: string
  inviterName: string
  role: string
  expiresAt: string
}

export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured - email sending disabled')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${data.invitationToken}`
    
    const emailHtml = generateInvitationEmailHtml({
      ...data,
      invitationUrl
    })

    const emailOptions: EmailOptions = {
      to: data.recipientEmail,
      subject: `You're invited to join ${data.companyName} on Parrot`,
      html: emailHtml,
      from: process.env.FROM_EMAIL || 'noreply@parrot.com'
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailOptions)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return { success: false, error: `Email service error: ${errorData.message || 'Unknown error'}` }
    }

    const result = await response.json()
    console.log('Email sent successfully:', result.id)
    
    return { success: true }
  } catch (error) {
    console.error('Error sending invitation email:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

function generateInvitationEmailHtml(data: InvitationEmailData & { invitationUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to Join ${data.companyName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #ff6b35;
            margin-bottom: 10px;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #7f8c8d;
            font-size: 16px;
        }
        .content {
            margin-bottom: 30px;
        }
        .invitation-details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .detail-label {
            font-weight: bold;
            color: #2c3e50;
        }
        .detail-value {
            color: #7f8c8d;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            color: #7f8c8d;
            font-size: 14px;
        }
        .expiry-notice {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🦜 Parrot</div>
            <h1 class="title">You're Invited!</h1>
            <p class="subtitle">Join ${data.companyName} on our business management platform</p>
        </div>
        
        <div class="content">
            <p>Hi ${data.recipientName},</p>
            
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.companyName}</strong> on Parrot as a <strong>${data.role}</strong>.</p>
            
            <div class="invitation-details">
                <div class="detail-row">
                    <span class="detail-label">Company:</span>
                    <span class="detail-value">${data.companyName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Role:</span>
                    <span class="detail-value">${data.role}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invited by:</span>
                    <span class="detail-value">${data.inviterName}</span>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="${data.invitationUrl}" class="cta-button">
                    Accept Invitation & Create Account
                </a>
            </div>
            
            <div class="expiry-notice">
                <strong>⏰ This invitation expires on ${new Date(data.expiresAt).toLocaleDateString()}</strong>
            </div>
            
            <p>Once you accept the invitation, you'll be able to:</p>
            <ul>
                <li>Access your company's projects and tasks</li>
                <li>Collaborate with your team members</li>
                <li>Manage your business operations</li>
                <li>Track progress and analytics</li>
            </ul>
            
            <p>If you have any questions, please contact your team administrator.</p>
        </div>
        
        <div class="footer">
            <p>This invitation was sent by ${data.inviterName} from ${data.companyName}</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
  `
}

export async function sendBulkInvitationEmails(invitations: Array<{
  email: string
  full_name: string
  company_id: string
  role: string
  invitation_token: string
  expires_at: string
  invited_by: string
  company_name?: string
  inviter_name?: string
}>): Promise<{ success: boolean; results: Array<{ email: string; success: boolean; error?: string }> }> {
  const results = []
  
  for (const invitation of invitations) {
    const result = await sendInvitationEmail({
      recipientName: invitation.full_name,
      recipientEmail: invitation.email,
      companyName: invitation.company_name || 'Your Company',
      invitationToken: invitation.invitation_token,
      inviterName: invitation.inviter_name || 'Your Administrator',
      role: invitation.role,
      expiresAt: invitation.expires_at
    })
    
    results.push({
      email: invitation.email,
      success: result.success,
      error: result.error
    })
  }
  
  const allSuccessful = results.every(r => r.success)
  
  return {
    success: allSuccessful,
    results
  }
}
