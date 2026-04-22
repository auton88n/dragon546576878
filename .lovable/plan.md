

## Goal
Fix the admin sidebar so it is a **narrow, properly-placed icon strip** (like the reference Supabase look) instead of the oversized, full-width dark panel currently overlapping the page.

## What's wrong now
Looking at the screenshot:
1. The sidebar is **way too wide** — it takes ~half the screen instead of a thin icon column.
2. It **overlaps the StaffHeader and content** instead of sitting beside them.
3. It **starts below the header** (top portion is cut by the header bar).
4. In Arabic (RTL) it's positioned correctly on the right, but the width and stacking are wrong.

Root cause: `SidebarProvider` is wrapped *inside* the page content (after `StaffHeader`) instead of around the whole layout, and the Sidebar is using its default expanded width (`16rem`) because `defaultOpen={false}` alone doesn't override the icon-mode width when the surrounding layout doesn't give it the icon-strip CSS variables. The sidebar is also rendering as an `offcanvas`-style overlay rather than an inline icon rail.

## Fix

### 1. `src/pages/AdminPage.tsx` — restructure layout
- Wrap the **entire admin page** (header + content) with `SidebarProvider` so the sidebar participates in the page flex layout.
- Use a top-level flex row: `<SidebarProvider><div className="min-h-screen flex w-full">…</div></SidebarProvider>`.
- Put `<AdminSidebar />` as the first flex child.
- Put `<SidebarInset>` (or a plain `flex-1 flex-col` div) containing `StaffHeader` + dashboard content as the second child.
- Move the `SidebarTrigger` into the StaffHeader area (or a thin top bar above the stats) so users can expand/collapse.
- Keep `defaultOpen={false}` so it starts collapsed to the narrow icon rail.

### 2. `src/components/admin/AdminSidebar.tsx` — enforce narrow width
- Keep `collapsible="icon"` (this gives the ~3rem icon-only width when collapsed).
- Remove any `w-*` overrides on the `<Sidebar>` element so it uses the built-in `--sidebar-width-icon` (3rem) when collapsed and `--sidebar-width` (16rem) only when expanded.
- Ensure menu buttons stay `h-9 w-9` centered icons (already done) so the rail looks tight.
- Keep group dividers and the heritage-brown background.

### 3. Result
```text
┌────────────────────────────────────────────────────┐
│  StaffHeader (full width, with sidebar trigger)    │
├──┬─────────────────────────────────────────────────┤
│🎫│  Stats cards                                    │
│📊│                                                 │
│──│  Stalled payments alert                         │
│🏢│                                                 │
│✉️│  Active panel content                           │
│🎧│                                                 │
│──│                                                 │
│💳│                                                 │
│⚙️│                                                 │
└──┴─────────────────────────────────────────────────┘
```
- Narrow ~48px icon rail on the left (right in Arabic)
- Sits inline with the page, no overlap
- Click the trigger in the header to expand to full labels, click again to collapse

## Files Touched
| File | Change |
|------|--------|
| `src/pages/AdminPage.tsx` | Move `SidebarProvider` to wrap the whole page; restructure into flex row with sidebar + inset; place `SidebarTrigger` in the header bar |
| `src/components/admin/AdminSidebar.tsx` | Remove any width overrides so the built-in icon-rail width (3rem) applies when collapsed |

No other files affected. All panels, hooks, and functionality remain untouched.

