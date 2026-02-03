

# Fix RTL Layout Bug - Add Missing RTL Class

## Problem Identified

The pages work in English but break in Arabic because they're missing the **`rtl`/`ltr` CSS class** that the working homepage uses.

**Working Homepage (Index.tsx):**
```tsx
<div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
```

**Broken Pages (Contact/GroupBookings):**
```tsx
<div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

The pages have the `dir` attribute but are **missing the `rtl` or `ltr` class** in the className. Tailwind's RTL utilities and some browser rendering behaviors depend on this class being present.

## Solution

Match the exact pattern from the working homepage by adding the dynamic RTL class.

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/pages/ContactPage.tsx` | 124 | Add `${isRTL ? 'rtl' : 'ltr'}` to className |
| `src/pages/GroupBookingsPage.tsx` | 180, 208 | Add `${isRTL ? 'rtl' : 'ltr'}` to both wrapper classNames |

## Code Changes

### ContactPage.tsx (Line 124)

**From:**
```tsx
<div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

**To:**
```tsx
<div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
```

### GroupBookingsPage.tsx (Lines 180 and 208)

**From:**
```tsx
<div className="min-h-screen flex flex-col bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

**To:**
```tsx
<div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
```

## Why This Works

1. The `dir` attribute tells the browser the text direction
2. The `rtl`/`ltr` **class** enables Tailwind's RTL variants (`rtl:text-right`, etc.)
3. Some tablet browsers (especially on Android) use both the attribute AND class together for proper layout calculation
4. The homepage uses this exact pattern and works perfectly on tablets in both languages

## Testing

After publishing:
1. Open Contact page on tablet in Arabic mode
2. Verify content spans full width (no collapse to right)
3. Switch to English - should continue working
4. Test GroupBookings page the same way

