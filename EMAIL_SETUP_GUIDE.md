# Email Setup Guide for User Invitations

## Overview
The user invitation system now includes email functionality using Resend API. When admins invite users, they will receive a professional email with an invitation link.

## Setup Steps

### 1. Get Resend API Key
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env.local` file

### 2. Configure Environment Variables
Add these to your `.env.local` file:

```bash
# Email Configuration
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Existing Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Verify Email Domain (Optional)
- For production, verify your domain in Resend
- For development, you can use the default Resend domain

### 4. Test the System
1. Invite a user through the admin interface
2. Check that the invitation is created in the database
3. Verify the email is sent (check Resend dashboard)
4. Test the invitation link

## Features

### Email Template
- Professional HTML email design
- Company branding
- Invitation details (role, company, inviter)
- Secure invitation link
- Expiration notice
- Mobile-responsive design

### Email Content Includes:
- Recipient's name
- Company name
- Assigned role
- Inviter's name
- Secure invitation link
- Expiration date
- Instructions for account creation

### Error Handling
- Graceful fallback if email service fails
- Invitation still created in database
- Console warnings for debugging
- Non-blocking email failures

## Troubleshooting

### Email Not Sending
1. Check `RESEND_API_KEY` is correct
2. Verify `FROM_EMAIL` is valid
3. Check Resend dashboard for errors
4. Look at server console logs

### Invitation Link Not Working
1. Verify `NEXT_PUBLIC_APP_URL` is correct
2. Check invitation token in database
3. Ensure invitation hasn't expired
4. Verify RLS policies allow public access

### Development vs Production
- Development: Use localhost URL
- Production: Use your actual domain
- Verify domain in Resend for production
- Use verified email addresses for FROM_EMAIL

## Security Notes
- Invitation tokens are cryptographically secure
- Links expire after 7 days
- RLS policies protect invitation data
- Email addresses are validated before sending
