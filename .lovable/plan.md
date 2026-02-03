
# Match Pages to Working Homepage Pattern

## Problem Analysis

Based on the screenshot showing content pushed to the far right on tablets, and comparing with the working Index.tsx homepage, there's a key difference in the page wrapper structure.

**Working Homepage (Index.tsx line 71):**
```tsx
<div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
```

**Broken Pages (Contact/GroupBookings):**
```tsx
<div className="min-h-screen w-full flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

The `w-full` class we added in the last fix is interacting badly with the `min-width: 100%` on `#root` in the CSS, causing layout issues on tablets.

## Solution

Match the EXACT pattern from the working homepage:

### File Changes

| File | Line(s) | Change |
|------|---------|--------|
| `src/pages/ContactPage.tsx` | 124 | Remove `w-full` from wrapper div |
| `src/pages/GroupBookingsPage.tsx` | 180, 208 | Remove `w-full` from both wrapper divs |
| `src/index.css` | 37 | Change `min-width: 100%` back to something safer |

### 1. ContactPage.tsx (Line 124)

**From:**
```tsx
<div className="min-h-screen w-full flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

**To:**
```tsx
<div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

### 2. GroupBookingsPage.tsx (Lines 180 and 208)

**From:**
```tsx
<div className="min-h-screen w-full flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

**To:**
```tsx
<div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

### 3. index.css (Line 37)

The `min-width: 100%` combined with RTL may be causing issues. Simplify to match a stable state:

**From:**
```css
#root {
  overflow-x: hidden;
  max-width: 100vw;
  width: 100%;
  min-width: 100%; /* Prevents shrinking on tablets */
}
```

**To:**
```css
#root {
  overflow-x: hidden;
  max-width: 100vw;
  width: 100%;
}
```

Remove the `min-width` entirely - the `width: 100%` already ensures full width.

## Container Pattern Already Correct

The container usage is already following the correct pattern:
- `<div className="container">` ✓ (already clean in both pages)
- Using `max-w-*xl mx-auto` inside containers ✓

No changes needed to container usage.

## Summary of Changes

1. **Remove `w-full`** from ContactPage and GroupBookingsPage wrappers
2. **Remove `min-width: 100%`** from `#root` in index.css
3. This makes both pages match the working Index.tsx pattern exactly

## Testing

After publishing:
1. Clear browser cache on tablet
2. Navigate to `/contact` and `/group-bookings`
3. Verify content spans full width
4. Verify header is visible at top
5. Test in both Arabic (RTL) and English (LTR) modes
