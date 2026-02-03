

# Fix: Contact and Group Bookings Pages - Container Class Mismatch

## Problem Identified

After thorough comparison of all pages, I found the **root cause** of the tablet layout issues on Contact and GroupBookings pages:

### Working Pages (Index, About, Support)
These use the standard Tailwind container:
```tsx
<div className="container">
```

### Broken Pages (Contact, GroupBookings)
These use a modified container with redundant/conflicting classes:
```tsx
<div className="container mx-auto px-4">
```

## Why This Causes Issues

The Tailwind config already defines the container with:
```typescript
container: {
  center: true,        // Handles centering (mx-auto is redundant)
  padding: "2rem",     // 32px padding built-in
}
```

**The conflict:**
- `mx-auto` duplicates what `center: true` already does
- `px-4` (16px) overrides the configured `padding: "2rem"` (32px)
- On tablets, this creates inconsistent spacing that causes layout collapse on some browsers

## Solution

Standardize all container usage across Contact and GroupBookings pages to match the working pages by removing `mx-auto px-4` from the container classes.

### Files to Modify

**1. src/pages/ContactPage.tsx**

| Section | Line | Current | Fixed |
|---------|------|---------|-------|
| Hero | 139 | `container mx-auto px-4` | `container` |
| Info Cards | 153 | `container mx-auto px-4` | `container` |
| Form | 179 | `container mx-auto px-4` | `container` |
| Map | 309 | `container mx-auto px-4` | `container` |

**2. src/pages/GroupBookingsPage.tsx**

| Section | Line | Current | Fixed |
|---------|------|---------|-------|
| Success State | 183 | `container mx-auto px-4` | `container` |
| Hero | 223 | `container mx-auto px-4` | `container` |
| Benefits | 247 | `container mx-auto px-4` | `container` |
| Form | 270 | `container mx-auto px-4` | `container` |

## Technical Details

### Why `container` Alone Works

The Tailwind `container` class with the current configuration:
- Sets responsive max-widths automatically
- Centers the container horizontally (`center: true`)
- Applies consistent 2rem (32px) horizontal padding
- Works consistently across all viewport sizes including tablets

### Why the Extra Classes Cause Problems

1. **CSS Specificity Conflict**: When both `container` (with built-in padding) and `px-4` are applied, the explicit `px-4` wins due to CSS cascade order
2. **Insufficient Padding**: 16px (`px-4`) vs 32px (`2rem`) means less breathing room on tablets
3. **Browser Variance**: Some tablet browsers (especially WebKit-based) calculate widths differently when conflicting padding rules exist
4. **Grid Children Affected**: Less container padding means grid children have less room, potentially causing overflow on 2-column layouts

## Implementation

The fix requires 8 simple class changes - removing `mx-auto px-4` from container divs in both files.

