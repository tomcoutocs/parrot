# Client Portal - Setup Guide

## 🚀 Quick Start Guide

This guide will walk you through setting up the Client Portal application from scratch. Follow these steps to get your portal running in **less than 30 minutes**.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **npm or yarn** package manager
- **Git** for version control
- A **Supabase account** (free tier available)
- A text editor (VS Code recommended)

## 🛠️ Step-by-Step Setup

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repository-url>
cd client-portal

# Install dependencies
npm install

# Verify installation
npm list
```

**Expected Result:** All dependencies should install without errors.

---

### Step 2: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)** and sign up/sign in
2. **Click "New Project"**
3. **Choose your organization**
4. **Fill in project details:**
   - Project Name: `client-portal`
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to your users
5. **Click "Create new project"**
6. **Wait 2-3 minutes** for project creation

---

### Step 3: Configure Database

1. **Open your Supabase project dashboard**
2. **Go to SQL Editor** (left sidebar)
3. **Create a new query**
4. **Copy the entire contents** of `database/schema.sql`
5. **Paste into the SQL editor**
6. **Click "Run"** to execute

**Expected Result:** You should see success messages and 8 tables created.

---

### Step 4: Get Supabase Credentials

1. **In your Supabase dashboard**, go to **Settings > API**
2. **Copy the following values:**
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)
   - **Service role secret** (starts with `eyJ...`) - **Keep this secure!**

---

### Step 5: Environment Configuration

1. **Create `.env.local`** in your project root:

```bash
# Create the file (Windows)
type nul > .env.local

# Create the file (Mac/Linux)
touch .env.local
```

2. **Add your credentials** to `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-here-make-it-long-and-random
```

**⚠️ Important:** 
- Replace `your-project-id` with your actual Supabase project ID
- Replace the keys with your actual keys from Step 4
- Generate a secure `NEXTAUTH_SECRET` (32+ characters)

---

### Step 6: Test Database Connection

1. **Verify your setup** by checking Supabase dashboard:
   - Go to **Database > Tables**
   - You should see 8 tables: `users`, `messages`, `documents`, etc.
   - Go to **Authentication > Users**
   - You should see 3 demo users

2. **Test the demo data:**
   - Go to **Table Editor > users**
   - Verify you see 3 users with emails:
     - `admin@company.com`
     - `manager@company.com`
     - `user@company.com`

---

### Step 7: Start the Application

```bash
# Start the development server
npm run dev

# Alternative if you prefer yarn
yarn dev
```

**Expected Result:** 
- Server starts on `http://localhost:3000`
- No compilation errors
- Console shows "Ready" message

---

### Step 8: Test the Application

1. **Open your browser** to `http://localhost:3000`
2. **You should be redirected** to `/auth/signin`
3. **Try logging in** with demo credentials:
   - **Admin**: `admin@company.com` / `demo123`
   - **Manager**: `manager@company.com` / `demo123`
   - **User**: `user@company.com` / `demo123`

4. **Test each role:**
   - **Admin**: Should see all tabs including "Admin Panel"
   - **Manager**: Should see all tabs except "Admin Panel"
   - **User**: Should see "Book Call" instead of "Admin Panel"

---

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Application loads at `http://localhost:3000`
- [ ] Sign-in page displays correctly
- [ ] All three demo accounts can log in
- [ ] Dashboard shows different navigation for each role
- [ ] Analytics tab displays charts and KPIs
- [ ] Sidebar navigation works
- [ ] User profile shows correct role badge
- [ ] Sign out works properly

---

## 🔧 Troubleshooting

### Issue: Application won't start

**Symptoms:** `npm run dev` fails or shows errors

**Solutions:**
1. **Check Node.js version:** `node --version` (should be 18+)
2. **Clear node_modules:** `rm -rf node_modules && npm install`
3. **Check for port conflicts:** Try `npm run dev -- --port 3001`

### Issue: Database connection errors

**Symptoms:** Authentication fails or data doesn't load

**Solutions:**
1. **Verify environment variables** in `.env.local`
2. **Check Supabase project status** in dashboard
3. **Ensure RLS policies are enabled** in Supabase
4. **Verify demo data exists** in users table

### Issue: Authentication not working

**Symptoms:** Login fails with correct credentials

**Solutions:**
1. **Check `NEXTAUTH_SECRET`** is set and secure
2. **Verify Supabase keys** are correct
3. **Clear browser cookies** and try again
4. **Check console** for JavaScript errors

### Issue: Charts/Analytics not displaying

**Symptoms:** Analytics tab shows blank or errors

**Solutions:**
1. **Check browser console** for errors
2. **Verify Recharts installation:** `npm list recharts`
3. **Refresh the page** to reload components
4. **Try different browser** to rule out compatibility issues

---

## 🚀 Next Steps

### Immediate Actions (First Day)
1. **Test all three user roles** thoroughly
2. **Explore the analytics dashboard** features
3. **Check responsive design** on mobile/tablet
4. **Review the codebase structure** in your editor

### Week 1 Goals
1. **Customize branding** (colors, logo, company name)
2. **Set up production Supabase project**
3. **Plan first feature implementation** (see Feature Backlog)
4. **Set up version control workflow**

### Month 1 Objectives
1. **Implement user management** (admin features)
2. **Build real-time chat system**
3. **Deploy to production environment**
4. **Gather user feedback** from initial testing

---

## 📚 Additional Resources

### Documentation
- [README.md](../README.md) - Complete project overview
- [MVP-SUMMARY.md](./MVP-SUMMARY.md) - What's been delivered
- [FEATURE-BACKLOG.md](./FEATURE-BACKLOG.md) - Future development plan

### External Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/docs)

### Community & Support
- [Next.js GitHub Discussions](https://github.com/vercel/next.js/discussions)
- [Supabase Discord Community](https://discord.supabase.com/)
- [Tailwind CSS Discord](https://discord.gg/7NF8GNe)

---

## 🎯 Success Confirmation

**You've successfully set up the Client Portal when:**

✅ All three demo accounts can log in  
✅ Different navigation appears for each role  
✅ Analytics dashboard shows interactive charts  
✅ Application is responsive on mobile  
✅ No console errors during normal usage  
✅ Sign out functionality works correctly  

**Congratulations! Your client portal is ready for development and customization.**

---

## 🆘 Need Help?

If you encounter issues not covered in this guide:

1. **Check the troubleshooting section** above
2. **Review the console logs** for error details
3. **Verify environment variables** are correct
4. **Test with a fresh browser/incognito** window
5. **Create an issue** in the project repository with details

**Include in your issue report:**
- Operating system and browser
- Node.js version (`node --version`)
- Error messages (full text)
- Steps to reproduce
- Environment variables (without actual values)

---

*This setup guide should get you running quickly. The application is designed to work out-of-the-box with minimal configuration needed.* 