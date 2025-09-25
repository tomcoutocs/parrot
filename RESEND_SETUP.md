# Resend Email Setup Guide

## 🔧 **Current Issue**
The error indicates that the domain used for sending emails is not verified in Resend. Here's how to fix it:

## 📋 **Step-by-Step Setup**

### 1. **Get Your Resend API Key**
- Go to [resend.com](https://resend.com)
- Sign up/login to your account
- Go to API Keys section
- Create a new API key (starts with `re_`)

### 2. **Add Domain to Resend**
- In your Resend dashboard, go to **Domains**
- Click **Add Domain**
- Enter your domain (e.g., `yourdomain.com`)
- Follow the DNS verification steps

### 3. **DNS Configuration**
You'll need to add these DNS records to your domain:

#### **TXT Record (Domain Verification)**
```
Type: TXT
Name: @
Value: [Resend will provide this]
```

#### **DKIM Records (Email Authentication)**
```
Type: CNAME
Name: resend._domainkey
Value: [Resend will provide this]
```

#### **SPF Record (Sender Policy)**
```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

### 4. **Environment Configuration**
Create/update your `.env.local` file:

```env
# Resend Configuration
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Important**: Replace `yourdomain.com` with your actual verified domain!

### 5. **Alternative: Use Resend's Test Domain**
For testing, you can use Resend's built-in domain:

```env
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

## 🚨 **Common Issues**

### **Domain Not Verified**
- Ensure DNS records are properly set
- Wait 24-48 hours for DNS propagation
- Check domain status in Resend dashboard

### **API Key Issues**
- Verify API key is correct and active
- Check if API key has proper permissions

### **From Email Mismatch**
- Use an email address from your verified domain
- Don't use placeholder domains like `yourdomain.com`

## 🧪 **Testing**

1. Set up environment variables
2. Restart your development server
3. Try sending an invitation
4. Check console logs for success/error messages

## 📞 **Need Help?**

- Check Resend documentation: https://resend.com/docs
- Verify domain status in Resend dashboard
- Contact Resend support if domain verification fails
