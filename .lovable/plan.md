

# Convert Admin Panel Tabs to Left Sidebar Navigation

## Goal

Transform the horizontal pill-style tabs in the admin dashboard into a professional **left-side vertical sidebar** using the project's existing shadcn `Sidebar` component, giving the admin panel a more functional, app-like look.

## What Changes

### Visual Result
- Left side: collapsible vertical navigation (icon + label)
- Right side: the active panel content fills the rest of the screen
- Sidebar can collapse to icon-only mode (saves space on smaller screens)
- Mobile: sidebar becomes a slide-out drawer with a hamburger trigger
- Heritage gold accent for the active item to match brand
- RTL aware: in Arabic, sidebar appears on the right side automatically

### What Stays the Same
- All 7 panels remain (Bookings, Reports, Settings, Corporate, Messages, AYN Support, Refunds)
- All existing functionality, dialogs, filters, stats cards untouched
- Lazy-loading of panels preserved
- StaffHeader, stats cards, alerts, and bulk actions bar all stay in place

## Layout Diagram

```text
┌───────────────────────────────────────────────────────┐
│ StaffHeader (top, full width)                         │
├──────────┬────────────────────────────────────────────┤
│          │  Stats cards (4)                           │
│ [Logo]   │                                            │
│          │  Stalled Payments Alert                    │
│ ▸ Book.  │                                            │
│ ▸ Reprt  │  ┌──────────────────────────────────────┐ │
│ ▸ Settn  │  │                                      │ │
│ ▸ Corp.  │  │  Active panel content                │ │
│ ▸ Msgs   │  │  (Bookings / Reports / etc.)         │ │
│ ▸ Suppt  │  │                                      │ │
│ ▸ Refnd  │  └──────────────────────────────────────┘ │
│          │                                            │
│ [<<]     │                                            │
└──────────┴────────────────────────────────────────────┘
│ Powered by AYN footer                                 │
└───────────────────────────────────────────────────────┘
```

In Arabic mode the sidebar swaps to the right side automatically.

## Technical Approach

### 1. New file: `src/components/admin/AdminSidebar.tsx`
- Uses shadcn `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuItem`, `useSidebar`
- Receives `activeTab` and `onTabChange` props
- Renders the 7 nav items with their lucide icons (Ticket, BarChart3, Settings, Building2, Mail, Headset, CreditCard)
- Active item styled with `gradient-gold` / accent ring to match the existing pill style
- `collapsible="icon"` so it shrinks to a narrow icon strip
- Shows project Logo at the top of the sidebar
- Hides labels when collapsed; tooltips appear on hover

### 2. Update `src/pages/AdminPage.tsx`
- Replace the `<Tabs>` + `<TabsList>` block with:
  - `SidebarProvider` wrapping the layout
  - `AdminSidebar` on the left
  - Main content area still uses `<Tabs>` (controlled, no `TabsList`) so each `<TabsContent>` continues to work — only the trigger UI is replaced by the sidebar
- Convert `Tabs` to controlled mode: `value={activeTab}` + `onValueChange={setActiveTab}`
- Add a `SidebarTrigger` inside the main content header area so users can collapse/expand the sidebar
- Keep stats cards, alerts, dialogs, and the bulk-actions bar exactly where they are
- Preserve `dir={isRTL ? 'rtl' : 'ltr'}` so the sidebar mirrors automatically in Arabic

### 3. Bilingual labels
- Each nav item has both Arabic and English labels chosen at render time via `isArabic`
- Same labels currently used in the tab triggers — no translation work needed

### 4. Responsive behavior
- Desktop (≥768px): sidebar visible, collapsible to icon strip
- Mobile (<768px): sidebar hidden by default, opens as a sheet via the hamburger `SidebarTrigger` in the header row
- Default state on first load: expanded on desktop, closed on mobile

### 5. Styling notes
- Active item uses heritage gold gradient + dark text (matches existing active tab style)
- Inactive items: muted text, hover with `bg-muted/50`
- Sidebar background: `bg-card` with subtle right-border in heritage brown
- No changes to `index.css` required — uses existing `--sidebar-*` design tokens that ship with shadcn

## Files Touched

| File | Change |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | **New** — sidebar component with 7 nav items |
| `src/pages/AdminPage.tsx` | Wrap layout in `SidebarProvider`, remove `TabsList`, add `SidebarTrigger`, control `Tabs` via state |

No other files are affected. All panels, hooks, dialogs, and edge functions remain untouched.

## Out of Scope

- No changes to the panel components themselves
- No changes to routing (still single `/admin` route)
- No changes to permissions or auth
- No changes to mobile-specific Scanner / Support pages

