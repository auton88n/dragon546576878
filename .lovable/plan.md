
# Fix: Contact Us and Corporate Bookings Pages - Layout Issue

## Problem Summary
The Contact Us (`/contact`) and Corporate Bookings (`/group-bookings`) pages appear "small in corner" on tablet devices on the **published URL only**.

## Root Cause Analysis

### Comparison of Page Structures

| Page | Root Classes | Works? |
|------|--------------|--------|
| Index.tsx | `min-h-screen flex flex-col bg-background` | Yes |
| BookingPage.tsx | `min-h-screen flex flex-col bg-background` | Yes |
| TermsPage.tsx | `min-h-screen flex flex-col bg-background` | Yes |
| ContactPage.tsx | `min-h-screen flex flex-col w-full bg-background` | Fixed (in preview) |
| GroupBookingsPage.tsx | `min-h-screen flex flex-col w-full bg-background` | Fixed (in preview) |
| AboutPage.tsx | `min-h-screen bg-background` | Missing structure |

### What Was Already Fixed
The code for ContactPage and GroupBookingsPage has already been updated with `flex flex-col w-full` classes in the previous change. The global CSS in `index.css` also has:

```css
html, body {
  width: 100%;
  min-width: 100%;
  max-width: 100vw;
}

#root {
  width: 100%;
  min-width: 100vw;
  max-width: 100vw;
}
```

### Why Published Site Still Broken
The **published URL** is serving an older cached version of the code. The fixes exist in the preview environment but have not been deployed to production yet.

## Solution

### Step 1: Publish the Latest Changes
Click "Publish" → "Update" in the Lovable interface to deploy the fixes that are already in the codebase:
- Updated ContactPage.tsx with `flex flex-col w-full`
- Updated GroupBookingsPage.tsx with `flex flex-col w-full`
- Updated index.css with explicit width rules

### Step 2: Fix AboutPage.tsx (Preventive)
The AboutPage is missing the `flex flex-col` structure that all other pages have. Add it for consistency:

**Current:**
```tsx
<div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

**Should be:**
```tsx
<div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

### Step 3: Clear Browser Cache After Publishing
After publishing, users need to clear their browser cache or hard refresh:
- **Chrome Desktop**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- **Chrome Tablet**: Settings → Privacy → Clear browsing data → Cached images and files

## Files to Modify
1. **src/pages/AboutPage.tsx** - Add missing `flex flex-col` to root div (preventive fix)

## Testing Checklist
After publishing and clearing cache:
- Test /contact on tablet (Arabic + English)
- Test /group-bookings on tablet (Arabic + English)
- Test /about on tablet (Arabic + English)
- Verify pages fill full screen width with no blank areas
