# Parrot Client Portal — UI/UX Audit Report

**Audit Date:** February 16, 2026  
**Last Verified:** February 16, 2026  
**Auditor:** UI/UX Engineering Review  
**Scope:** All pages, tabs, and interactive elements across the platform

---

## Executive Summary

| Category | Overall Score | Status |
|----------|---------------|--------|
| Auth & Entry | 92/100 | ✅ Improved |
| Apps Hub | 90/100 | ✅ Improved |
| Dashboard (Client Portal) | 72/100 | ⚠️ Data issues (backend) |
| Lead Generation | 82/100 | ✅ Good |
| CRM | 80/100 | ✅ Good |
| Invoicing | 85/100 | ✅ Improved (graceful 404 fallback) |
| Analytics | 78/100 | ⚠️ Data issues (backend) |
| User Management | 84/100 | ✅ Good (resend fixed) |
| Platform Customization | 86/100 | ✅ Good |
| Automations | 83/100 | ✅ Good |
| System Admin | 90/100 | ✅ Improved |

**Critical Issues (backend):** Supabase schema/RLS mismatches causing 400s on projects, tasks, users, spaces, companies. `recurring_invoices` table 404 — UI now shows graceful fallback.

---

## 1. Auth Pages

### 1.1 Sign In (`/auth/signin`)

| Element | Function | Works? | UI Score |
|---------|----------|--------|----------|
| Logo (parrot-grad-main.png) | Brand display | ✅ | 95 |
| Email input | Credential entry | ✅ | 92 |
| Password input | Credential entry | ✅ | 92 |
| "Forgot password?" link | Opens reset modal | ✅ | 90 |
| Sign In button | Submit form | ✅ | 90 |
| Error alert | Display auth errors (with icon) | ✅ | 92 |
| Loading state (Loader2) | Submit feedback | ✅ | 90 |
| Reset Password modal | Inline reset flow | ✅ | 90 |
| Reset modal email input | Reset email entry | ✅ | 90 |
| Send Reset Link / Cancel | Modal actions | ✅ | 90 |
| Success state (CheckCircle2) | Reset confirmation | ✅ | 90 |

**Page Score: 92/100** — Clean layout, good accessibility (labels, autocomplete), proper loading states, error alerts with icons, dark-mode support in reset modal.

### 1.2 Reset Password (`/auth/reset-password`)

| Element | Function | Works? | UI Score |
|---------|----------|--------|----------|
| Token validation | Validates reset token on load | ✅ | 90 |
| Loading spinner | "Validating reset token..." (Loader2) | ✅ | 92 |
| New password input | Password entry | ✅ | 90 |
| Confirm password input | Match validation | ✅ | 90 |
| Client-side validation (min 8 chars) | Pre-submit check | ✅ | 92 |
| Error alert | Display errors (with AlertCircle icon) | ✅ | 92 |
| Reset Password button | Submit (size="lg") | ✅ | 90 |
| Back to Sign In button | Navigation | ✅ | 90 |
| Success state | Redirect after 3s | ✅ | 90 |

**Fixed:** Reset page now uses design tokens (`bg-gradient-to-br from-background via-background to-muted/20`), consistent Card styling, logo size, and error alerts with icons.

**Page Score: 92/100** — Styling now consistent with sign-in, proper design tokens.

---

## 2. Apps Hub (`/apps`)

### 2.1 Page Elements

| Element | Function | Works? | UI Score |
|---------|----------|--------|----------|
| Header logo | Brand | ✅ | 92 |
| NotificationBell | Notifications (aria-label, title) | ✅ | 90 |
| Help (Support Ticket) button | Open support modal | ✅ | 90 |
| User dropdown | Settings, System Admin, Sign Out | ✅ | 90 |
| App cards grid | Display available apps | ✅ | 90 |
| App card click | Navigate to app | ✅ | 90 |
| Permission-based visibility | Hide apps user can't access | ✅ | 90 |
| Loading spinner | Session loading (Loader2 + text) | ✅ | 92 |
| User Settings modal | Profile/settings | ✅ | 90 |
| Support Ticket modal | Create ticket | ✅ | 90 |

### 2.2 App Cards (per app)

| App | Card UI | Navigation | Permission Check |
|-----|--------|------------|------------------|
| Lead Generation | ✅ | ✅ | ✅ adminOnly |
| CRM | ✅ | ✅ | ✅ adminOnly |
| Client Portal | ✅ | ✅ dashboard | ✅ |
| Invoicing | ✅ | ✅ | ✅ adminOnly |
| User Management | ✅ | ✅ | ✅ adminOnly |
| Analytics | ✅ | ✅ | ✅ adminOnly |
| Automations | ✅ | ✅ | ✅ adminOnly |
| Platform Customization | ✅ | ✅ | ✅ adminOnly |

**Page Score: 90/100** — Clear hierarchy, role-based access. Improved loading UX, NotificationBell accessibility.

---

## 3. System Admin Choice (`/apps/system-admin-choice`)

| Element | Function | Works? | UI Score |
|---------|----------|--------|----------|
| Welcome message | Personalized greeting | ✅ | 90 |
| Platform Access card | Navigate to /apps | ✅ | 90 |
| System Admin card | Navigate to /apps/system-admin | ✅ | 90 |
| Role guard | Redirect non-system-admins | ✅ | 92 |
| Loading state | Session check (Loader2 + text) | ✅ | 92 |

**Page Score: 92/100** — Simple, clear choice. Cards have hover states. Improved loading UX.

---

## 4. Dashboard / Client Portal (`/dashboard`)

### 4.1 Layout & Navigation

| Element | Function | Works? | UI Score |
|---------|----------|--------|----------|
| Sidebar collapse | Toggle width | ✅ | 90 |
| Apps button | Back to /apps | ✅ | 90 |
| Space selector | Switch companies/spaces | ⚠️ | 75 |
| Admin nav (Dashboard, Projects, Tasks, etc.) | Tab navigation | ⚠️ | 72 |
| Client nav (Overview, Tasks, Documents, etc.) | Tab navigation | ⚠️ | 72 |
| Search spaces | Filter space list | ✅ | 90 |
| Create Space modal | Add new space | ✅ | 90 |
| User dropdown | Settings, Sign Out | ✅ | 90 |
| NotificationBell | Notifications (aria-label, title) | ✅ | 90 |
| Support Ticket | Help modal | ✅ | 90 |

**Known Data Issues (from error logs):**
- `projects` — 400: likely `space_id` vs `company_id` or FK/select mismatch
- `tasks` — 400: same schema/select issues
- `task_comments` — 400: FK/select issues
- `users` — 400: e.g. `last_login_at` or `is_active` column mismatch
- `spaces` / `companies` — 400: table or column mismatch

### 4.2 Tabs

| Tab | Content | Works? | UI Score |
|-----|---------|--------|----------|
| **spaces** | Space list, select space | ⚠️ Data 400s | 70 |
| **dashboard** (overview) | ModernOverviewTab | ⚠️ Data 400s | 72 |
| **user-dashboard** | Personal dashboard | ⚠️ Data 400s | 72 |
| **projects** | ModernTasksTab, projects/tasks | ⚠️ Data 400s | 70 |
| **documents** | ModernDocumentsTab | ⚠️ Data 400s | 72 |
| **company-calendars** | ModernCalendarTab | ⚠️ Data 400s | 72 |
| **reports** | ModernReportsTab | ⚠️ Data 400s | 72 |
| **admin** (users) | ModernUsersTab | ⚠️ Data 400s | 72 |
| **settings** | ModernSettingsTab | ⚠️ Data 400s | 72 |
| **forms** | LazyTabComponent | ✅ | 82 |
| **user-settings** | UserSettingsTab | ✅ | 85 |

**Dashboard Overall: 72/100** — UI structure is solid; backend/schema issues cause 400s and broken data.

---

## 5. Lead Generation (`/apps/lead-generation`)

### 5.1 Tabs

| Tab | Function | Works? | UI Score |
|-----|----------|--------|----------|
| **dashboard** | Lead stats, recent leads | ✅ | 85 |
| **pipeline** | Kanban board, stages | ✅ | 84 |
| **capture** | Forms, embed code | ✅ | 85 |
| **automation** | Workflows | ✅ | 82 |
| **campaigns** | Campaign list | ✅ | 83 |
| **campaign-builder** | Sequence builder | ✅ | 82 |
| **analytics** | Lead analytics | ✅ | 83 |
| **referrals** | Referral tracking | ✅ | 82 |
| **settings** | Integrations, custom fields | ✅ | 86 |

**App Score: 82/100** — Feature set is strong; some flows may need polish.

---

## 6. CRM (`/apps/crm`)

### 6.1 Tabs

| Tab | Function | Works? | UI Score |
|-----|----------|--------|----------|
| **dashboard** | Stats, pipeline, recent activity | ✅ | 84 |
| **contacts** | Lead list, create/edit | ✅ | 85 |
| **deals** | Deal pipeline | ✅ | 83 |
| **accounts** | Companies/accounts | ✅ | 82 |
| **activities** | Activity log | ✅ | 82 |
| **call-logs** | Call logging | ✅ | 82 |
| **reports** | CRM reports | ✅ | 80 |
| **settings** | CRM settings | ✅ | 84 |

**App Score: 80/100** — Uses `leads`, `companies`, `lead_stages`; structure looks correct.

---

## 7. Invoicing (`/apps/invoicing`)

### 7.1 Tabs

| Tab | Function | Works? | UI Score |
|-----|----------|--------|----------|
| **dashboard** | Revenue, outstanding, overdue | ✅ | 85 |
| **invoices** | Invoice list, create | ✅ | 85 |
| **calendar** | Invoice calendar | ✅ | 82 |
| **clients** | Client management | ✅ | 84 |
| **recurring** | Recurring invoices | ⚠️ Graceful fallback | 85 |
| **payments** | Payment tracking | ✅ | 84 |
| **expenses** | Expense tracking | ✅ | 83 |
| **ai-assistant** | AI assistant | ✅ | 80 |
| **reports** | Invoicing reports | ✅ | 82 |
| **settings** | Invoicing settings | ✅ | 85 |

**Recurring:** When table is missing, UI now shows friendly error message with "Try Again" and guidance to contact admin. Empty state improved with icon and copy.

**App Score: 85/100** — Recurring tab has graceful fallback; invoicing dashboard uses accurate stat descriptions.

---

## 8. Analytics (`/apps/analytics`)

### 8.1 Tabs

| Tab | Function | Works? | UI Score |
|-----|----------|--------|----------|
| **dashboard** | Analytics overview | ⚠️ | 78 |
| **reports** | Report builder, charts | ⚠️ | 76 |
| **visualizations** | Charts | ⚠️ | 76 |
| **explorer** | Data explorer | ⚠️ | 75 |
| **saved** | Saved reports | ⚠️ | 76 |
| **settings** | Analytics settings | ✅ | 84 |

**Note:** Depends on projects/tasks/users data; 400s will affect analytics.

**App Score: 78/100**

---

## 9. User Management (`/apps/user-management`)

### 9.1 Tabs

| Tab | Function | Works? | UI Score |
|-----|----------|--------|----------|
| **dashboard** | User management overview | ✅ | 85 |
| **users** | User list, create/edit | ✅ | 86 |
| **invitations** | Pending invites, resend | ✅ | 88 |
| **permissions** | Tab permissions | ✅ | 85 |
| **activity** | Activity feed | ✅ | 82 |
| **settings** | User management settings | ✅ | 85 |

**Resend Invitation:** Fixed (was 401). Sends `user_id` and `user_email` in body; API validates and uses `set_user_context`.

**App Score: 84/100**

---

## 10. Platform Customization (`/apps/platform-customization`)

### 10.1 Tabs

| Tab | Function | Works? | UI Score |
|-----|----------|--------|----------|
| **dashboard** | Quick links to sections | ✅ | 88 |
| **branding** | Logo, colors | ✅ | 86 |
| **themes** | Theme presets | ✅ | 86 |
| **layout** | Layout options | ✅ | 85 |
| **white-label** | White-label settings | ✅ | 85 |
| **email** | Email templates | ✅ | 85 |
| **preview** | Preview changes | ✅ | 86 |
| **settings** | Customization settings | ✅ | 85 |

**App Score: 86/100**

---

## 11. Automations (`/apps/automations`)

### 11.1 Tabs

| Tab | Function | Works? | UI Score |
|-----|----------|--------|----------|
| **builder** | Build automation | ✅ | 84 |
| **saved** | My automations | ✅ | 84 |
| **marketplace** | Browse templates | ✅ | 83 |
| **liked** | Liked automations | ✅ | 82 |
| **settings** | Automation settings | ✅ | 84 |

**App Score: 83/100**

---

## 12. System Admin (`/apps/system-admin`)

### 12.1 Tabs

| Tab | Function | Works? | UI Score |
|-----|----------|--------|----------|
| **analytics** | System analytics | ✅ | 84 |
| **monitoring** | System health | ✅ | 84 |
| **tickets** | Support tickets | ✅ | 85 |
| **reported-automations** | Reported automations | ✅ | 84 |

**App Score: 90/100** — Loading UX improved; layout consistent with other apps.

---

## 13. Special Pages

| Route | Function | Works? | UI Score |
|-------|----------|--------|----------|
| `/` | Redirect to /apps | ✅ | 95 |
| `/invite/[token]` | Accept invitation | ✅ | 90 |
| `/invitation/accept` | Accept invitation flow | ✅ | 90 |
| `/invoice/[token]` | Public invoice view | ✅ | 90 |
| `/documents/[id]` | Document viewer | ✅ | 90 |
| `/site-lock-login` | Site lock | ✅ | 92 |

---

## 14. Cross-Cutting Elements

| Element | Location | Works? | UI Score |
|---------|----------|--------|----------|
| NotificationBell | Apps, Dashboard, app layouts | ✅ | 90 |
| Support Ticket modal | Most layouts | ✅ | 90 |
| User Settings modal | Most layouts | ✅ | 90 |
| Sidebar collapse | All app layouts | ✅ | 90 |
| Search (nav filter) | Sidebars | ✅ | 90 |
| Dropdown menus | User menu, actions | ✅ | 90 |
| Toast notifications | Success/error feedback | ✅ | 90 |
| Loading states | Most data views | ✅ | 90 |
| Empty states | Lists, dashboards | ✅ | 90 |

---

## 15. Recommendations

### High Priority
1. **Fix Supabase schema/RLS** — Resolve 400s on `projects`, `tasks`, `task_comments`, `users`, `spaces`, `companies`. Check:
   - `space_id` vs `company_id` usage
   - `users` columns (`last_login_at`, `is_active`)
   - `spaces` vs `companies` naming
2. **Create `recurring_invoices` table** — Run `database-fixes/create_invoicing_tables.sql` or equivalent migration in production.

### Medium Priority
3. ~~**Unify reset-password styling**~~ — ✅ Done. Reset page now uses design tokens.
4. **Improve error handling** — ✅ Recurring invoices has graceful fallback. Extend pattern to other data-dependent views.

### Low Priority
5. **Loading UX** — Consider skeletons instead of spinners for list/dashboard views.
6. **Accessibility** — Add `aria-live` for dynamic content and ensure focus management in modals.

---

## 16. Score Summary by Area

| Area | Score | Notes |
|------|-------|------|
| Auth | 92 | Reset page styling fixed, error alerts improved |
| Apps Hub | 90 | Loading UX, NotificationBell accessibility |
| Dashboard | 72 | UI good; data layer broken (backend) |
| Lead Gen | 82 | Feature-complete |
| CRM | 80 | Solid |
| Invoicing | 85 | Recurring graceful fallback, stat descriptions |
| Analytics | 78 | Depends on fixed data (backend) |
| User Management | 84 | Resend fixed |
| Platform Customization | 86 | Strong |
| Automations | 83 | Solid |
| System Admin | 90 | Loading UX improved |

**Platform Average: 84/100** (up from 81)

*Last verified: February 16, 2026. Post-audit fixes applied for all items scoring <90 where UI changes were feasible. Dashboard/Analytics 400s require backend schema fixes.*
