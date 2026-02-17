# Accent Color Opportunities – Platform Scan

**Primary accent:** `#63a4ba` (soft matte teal blue) – defined in `globals.css` as `--primary`

---

## Philosophy: Subtle & Tasteful

The accent should feel like a **whisper, not a shout**. Use it sparingly to:

- Draw attention to key actions or states
- Add subtle hierarchy without overwhelming
- Create a calm, cohesive feel

**Avoid:** Coloring every icon, every stat card, every empty state. That dilutes the accent and makes the UI feel busy.

**Prefer:**  
- One or two accent touches per page or section  
- Hover states (accent appears on interaction)  
- Active/selected states only  
- Small, meaningful details (e.g., a single dot, a thin border)

---

## Recommended: Tasteful Placement

### 1. Lead Pipeline Preview – "New" stage only

**File:** `lead-pipeline-preview.tsx`

- Use `bg-primary` for the **"New"** stage dot only (the first stage in the pipeline).
- Keep other stages with their existing semantic colors (green for won, etc.).

**Why:** One clear accent that matches the Pipeline Overview design.

---

### 2. Active tab indicator (layout tabs)

**Files:** CRM, Lead Gen, Analytics, Invoicing, etc. layout components

- Add a **thin** `border-b-2 border-primary` or `border-l-2 border-l-primary` for the active tab.
- Keep tab text and icons muted; only the indicator line uses accent.

**Why:** Focuses where the user is without coloring every tab.

---

### 3. Apps layout header – page icon

**File:** `apps-layout-header.tsx`

- Use `text-primary` for the **page icon** only (e.g., Target for Lead Gen, Briefcase for CRM).
- Keep Help and ChevronDown muted.

**Why:** One clear accent that identifies the current app.

---

### 4. Empty state – hover only

**File:** `empty-state.tsx`

- Add `group-hover:text-primary` to the icon.
- Default state stays `text-muted-foreground`.

**Why:** Accent appears on interaction, not by default.

---

## Skip (Don’t Overdo)

| Area | Recommendation |
|------|----------------|
| **Stat card icons** (all dashboards) | Keep semantic colors (green for growth, etc.). Avoid accent on every stat. |
| **Settings modal section icons** | Keep muted. Too many icons in one view. |
| **All empty states** | Only use hover accent in the shared EmptyState component. Don’t add accent to every empty-state icon. |
| **Metric pills** (Metrics Card) | Keep current active state. Avoid accent on every metric. |
| **Sidebar hover** | Keep current. Sidebar already has clear active state. |
| **Notification bell** | Keep muted. |
| **Quick links** | Keep brand colors for known services. |
| **Platform customization** | Keep as-is or use a distinct color for that section. |

---

## Already Using Accent (Keep)

- Progress bars (`bg-primary`)
- Slider thumb (`border-primary`)
- Checkbox checked state
- Calendar selected dates
- Form templates icon
- Confirmation dialog icon
- Apps hub cards (icons on dashboard)

---

## Implementation Notes

- Use `text-primary` for icons and labels (Tailwind uses `--color-primary`)
- Use `bg-primary` for fills, dots, and backgrounds
- Use `border-primary` for active/selected borders
- Use `bg-primary/10` or `bg-primary/5` for very subtle highlights
- Preserve semantic colors (green for success, red for errors) where meaning matters
