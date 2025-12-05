# Email Deliverability Guide

This guide outlines best practices and configuration steps to prevent emails from going to spam.

## ✅ What We've Implemented

### 1. **Improved Email Templates**
- ✅ Added plain text versions alongside HTML (better spam filter compatibility)
- ✅ Improved HTML structure with proper table-based layouts
- ✅ Added proper meta tags and language attributes
- ✅ Removed spam trigger words and excessive formatting
- ✅ Added unique tracking headers (`X-Entity-Ref-ID`)

### 2. **Email Content Best Practices**
- ✅ Clear, honest subject lines
- ✅ Professional formatting
- ✅ Proper text-to-image ratio (no excessive images)
- ✅ Clear call-to-action buttons

## 🔧 Required Configuration Steps

### Step 1: Verify Your Domain in Resend

1. **Log into Resend Dashboard**: https://resend.com/domains
2. **Add Your Domain**: Add the domain you want to send emails from
3. **Add DNS Records**: Resend will provide you with DNS records to add:
   - **SPF Record**: Authorizes Resend to send emails on your behalf
   - **DKIM Record**: Signs your emails to prove authenticity
   - **DMARC Record**: Provides policy for handling unauthenticated emails

### Step 2: Configure DNS Records

Add these records to your domain's DNS settings (wherever you manage DNS - Cloudflare, GoDaddy, etc.):

#### SPF Record
```
Type: TXT
Name: @ (or your domain)
Value: v=spf1 include:resend.com ~all
```

#### DKIM Record
Resend will provide specific DKIM records - add them as instructed in the Resend dashboard.

#### DMARC Record (Recommended)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:your-email@yourdomain.com
```

**DMARC Policy Options:**
- `p=none` - Monitor only (start here)
- `p=quarantine` - Send suspicious emails to spam
- `p=reject` - Reject suspicious emails entirely

### Step 3: Set Environment Variables

Make sure these are set in your `.env` file:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com  # Must be from your verified domain
```

**Important**: The `FROM_EMAIL` must use a domain you've verified in Resend.

### Step 4: Warm Up Your Domain (New Domains)

If you're using a new domain:
1. Start with low volume (10-20 emails/day)
2. Gradually increase over 2-4 weeks
3. Monitor bounce rates and spam complaints
4. Maintain good engagement (opens/clicks)

## 📊 Monitoring & Maintenance

### Check Email Deliverability

1. **Resend Dashboard**: Monitor delivery rates, opens, clicks
2. **Check Spam Folders**: Periodically test sending to your own email
3. **Use Email Testing Tools**:
   - [Mail-Tester.com](https://www.mail-tester.com/) - Test spam score
   - [MXToolbox](https://mxtoolbox.com/) - Check DNS records

### Best Practices

1. **Maintain Clean Lists**: Remove bounced/invalid emails promptly
2. **Monitor Metrics**: Track open rates, click rates, bounce rates
3. **Avoid Spam Triggers**:
   - ❌ ALL CAPS
   - ❌ Excessive punctuation (!!!)
   - ❌ Spam words: "free", "guaranteed", "act now", etc.
   - ❌ Too many images with little text
   - ❌ Suspicious links or shortened URLs

4. **Good Practices**:
   - ✅ Clear, descriptive subject lines
   - ✅ Proper sender name (e.g., "Parrot Portal" not "noreply")
   - ✅ Plain text alternatives
   - ✅ Unsubscribe options (for marketing emails)
   - ✅ Consistent sending patterns

## 🚨 Troubleshooting

### Emails Still Going to Spam?

1. **Check DNS Records**: Verify SPF, DKIM, DMARC are properly configured
2. **Domain Reputation**: Check your domain's reputation at:
   - [Sender Score](https://www.senderscore.org/)
   - [MXToolbox Blacklist Check](https://mxtoolbox.com/blacklists.aspx)
3. **Test Email**: Send a test email and check headers for authentication
4. **Contact Resend Support**: They can help diagnose deliverability issues

### Common Issues

**"Domain not verified" error:**
- Make sure you've added all DNS records in Resend dashboard
- Wait 24-48 hours for DNS propagation
- Verify records are correct using DNS checker tools

**High bounce rate:**
- Clean your email list
- Remove invalid email addresses
- Don't send to purchased lists

**Low open rates:**
- Improve subject lines
- Send at optimal times
- Segment your audience
- Provide valuable content

## 📝 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Domain Verification Guide](https://resend.com/docs/dashboard/domains/introduction)
- [Email Deliverability Best Practices](https://resend.com/docs/send-emails/best-practices)

## 🔐 Security Notes

- Never commit API keys or sensitive credentials to git
- Use environment variables for all configuration
- Rotate API keys periodically
- Monitor for suspicious activity in Resend dashboard

