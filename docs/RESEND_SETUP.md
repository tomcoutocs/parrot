# Resend Email Setup Guide

Follow these steps to configure Resend for email delivery and prevent emails from going to spam.

## 📋 Prerequisites

1. A Resend account (sign up at https://resend.com)
2. Access to your domain's DNS settings
3. Your domain name (e.g., `yourdomain.com`)

## 🚀 Step-by-Step Setup

### Step 1: Get Your Resend API Key

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Give it a name (e.g., "Parrot Portal Production")
4. Copy the API key (starts with `re_`)
5. Add it to your `.env.local` file:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   ```

### Step 2: Add and Verify Your Domain

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Click "Add Domain"

### Step 3: Add DNS Records

Resend will show you the DNS records you need to add. You'll need to add these to your domain's DNS provider (Cloudflare, GoDaddy, Namecheap, etc.):

#### Required Records (from Resend Dashboard):

1. **SPF Record** (TXT record)
   - Name: `@` (or your domain name)
   - Value: `v=spf1 include:resend.com ~all`

2. **DKIM Record** (TXT record)
   - Resend will provide a specific DKIM selector and value
   - Example: Name: `resend._domainkey` Value: `[provided by Resend]`

3. **DMARC Record** (TXT record) - Recommended
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
   - Start with `p=none` (monitor only), then move to `p=quarantine` after confirming everything works

#### How to Add DNS Records:

**Cloudflare:**
1. Go to your domain → DNS → Records
2. Click "Add record"
3. Select the record type (TXT)
4. Enter the name and value
5. Click "Save"

**GoDaddy:**
1. Go to DNS Management
2. Click "Add" under Records
3. Select TXT from the dropdown
4. Enter the name and value
5. Click "Save"

**Other Providers:**
- Look for "DNS Settings", "DNS Management", or "Zone File"
- Add TXT records as shown above

### Step 4: Wait for Verification

1. After adding DNS records, go back to Resend dashboard
2. Click "Verify" on your domain
3. Wait 5-30 minutes for DNS propagation
4. Resend will show ✅ when verified

**Note:** DNS changes can take up to 48 hours to propagate globally, but usually complete within 30 minutes.

### Step 5: Set Your FROM_EMAIL

Once your domain is verified:

1. Choose an email address from your verified domain (e.g., `noreply@yourdomain.com` or `hello@yourdomain.com`)
2. Add it to your `.env.local`:
   ```env
   FROM_EMAIL=noreply@yourdomain.com
   ```

**Important:** 
- The email must be from your verified domain
- You don't need to create an actual mailbox - Resend handles sending
- Common choices: `noreply@`, `hello@`, `notifications@`, `support@`

### Step 6: Test Your Configuration

1. Restart your development server
2. Try sending a test invitation email
3. Check:
   - Email arrives in inbox (not spam)
   - Email headers show proper authentication
   - Links work correctly

## 🔍 Verifying DNS Records

After adding DNS records, verify they're correct:

### Using Command Line:
```bash
# Check SPF record
nslookup -type=TXT yourdomain.com

# Check DKIM record (replace with your selector)
nslookup -type=TXT resend._domainkey.yourdomain.com

# Check DMARC record
nslookup -type=TXT _dmarc.yourdomain.com
```

### Using Online Tools:
- [MXToolbox](https://mxtoolbox.com/TXTLookup.aspx) - Enter your domain and check TXT records
- [DNS Checker](https://dnschecker.org/) - Check DNS propagation globally

## ✅ Verification Checklist

- [ ] Resend API key added to `.env.local`
- [ ] Domain added in Resend dashboard
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC record added to DNS (recommended)
- [ ] Domain verified in Resend dashboard (green checkmark)
- [ ] `FROM_EMAIL` set in `.env.local` using verified domain
- [ ] Test email sent successfully
- [ ] Test email arrives in inbox (not spam)

## 🎯 Quick Reference

### Environment Variables Needed:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Production URL
```

### DNS Records Summary:
| Type | Name | Value |
|------|------|-------|
| TXT | `@` | `v=spf1 include:resend.com ~all` |
| TXT | `resend._domainkey` | `[from Resend dashboard]` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com` |

## 🆘 Troubleshooting

### "Domain not verified" error
- Check DNS records are added correctly
- Wait for DNS propagation (can take up to 48 hours)
- Use DNS checker tools to verify records are live
- Make sure you're using the exact values from Resend

### Emails still going to spam
- Verify all DNS records are correct
- Check domain reputation: https://www.senderscore.org/
- Test email with Mail-Tester: https://www.mail-tester.com/
- Start with low volume and gradually increase
- Ensure `FROM_EMAIL` uses verified domain

### "FROM_EMAIL not configured" error
- Make sure `FROM_EMAIL` is set in `.env.local`
- Restart your development server after adding
- Verify the email domain matches your verified domain in Resend

## 📚 Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Domain Setup](https://resend.com/docs/dashboard/domains/introduction)
- [Email Deliverability Guide](./EMAIL_DELIVERABILITY.md)

