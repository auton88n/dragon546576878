
# Fix Tablet Layout Issue - Content Pushed to Far Right

## Problem Identified

Based on the screenshot, the Contact and GroupBookings pages show:
- A massive empty space on the left side
- All content squeezed into the far right corner
- The header is not visible at the top

This is a **flexbox shrink issue** specific to tablet browsers (particularly on Android tablets with RTL mode). The `flex flex-col` wrapper combined with `min-width: 0` on `#root` is causing the content to collapse to minimum size.

## Root Cause Analysis

The issue is in **src/index.css** line 37:
```css
#root {
  overflow-x: hidden;
  max-width: 100vw;
  width: 100%;
  min-width: 0; /* THIS is causing the shrink on tablets */
}
```

The `min-width: 0` was added to fix a different grid issue, but on RTL tablet browsers, it's allowing the root container to shrink below its natural width.

## Solution

### 1. Fix the `#root` styles in index.css

Replace the problematic `min-width: 0` with proper tablet-safe styles:

```css
#root {
  overflow-x: hidden;
  max-width: 100vw;
  width: 100%;
  min-width: 100%; /* Changed from 0 - prevents shrinking on tablets */
}
```

### 2. Add explicit full-width to page wrappers

Update ContactPage.tsx and GroupBookingsPage.tsx to add `w-full` to their main wrapper:

**Before:**
```tsx
<div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

**After:**
```tsx
<div className="min-h-screen w-full flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

## Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Line 37: Change `min-width: 0` to `min-width: 100%` |
| `src/pages/ContactPage.tsx` | Line 124: Add `w-full` to wrapper div |
| `src/pages/GroupBookingsPage.tsx` | Line 208: Add `w-full` to wrapper div |

## Technical Details

### Why This Fix Works

1. **`min-width: 100%`** on `#root`:
   - Prevents the root from shrinking below viewport width
   - Still allows overflow-x handling to work
   - Compatible with RTL layouts

2. **`w-full`** on page wrappers:
   - Ensures the flex container takes full width
   - Prevents flexbox from calculating a smaller width
   - Works on both LTR and RTL layouts

### Why `min-width: 0` Caused the Issue

On tablet browsers (especially Android WebView), when a flex container has `min-width: 0`, the browser may calculate the minimum content width rather than the viewport width. In RTL mode, this calculation can go wrong, causing the content to collapse.

## Testing Plan

After deploying:
1. Clear browser cache on tablet
2. Navigate to almufaijer.com/contact
3. Verify content spans full width
4. Test in both portrait and landscape orientations
5. Test GroupBookingsPage as well
