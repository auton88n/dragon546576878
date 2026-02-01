
## Fix Navigation Menu Uneven Spacing

### Problem
The navigation menu spacing appears uneven on tablet and desktop, especially in Arabic (RTL) mode. Looking at the screenshot:
- Navigation items have different text lengths ("الدعم" is short, "حجوزات الشركات" is long)
- The fixed `gap-8` (32px) between all items makes the visual spacing feel inconsistent
- On larger screens, the wide gap can make shorter items appear too spread out

### Root Cause
The current `nav` element uses a fixed `gap-8` which doesn't adapt to different screen sizes or provide visual balance between items of varying text lengths.

### Solution
Adjust the navigation spacing to be more responsive and use a slightly smaller, more balanced gap:

**File:** `src/components/shared/Header.tsx`

### Changes:

**1. Adjust desktop navigation gap (line 87)**
Change from fixed `gap-8` to responsive gaps:

```tsx
// Current:
<nav className="hidden md:flex items-center gap-8">

// Fixed - responsive gap:
<nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8">
```

This creates:
- **md (tablet):** `gap-4` (16px) - tighter spacing for smaller screens
- **lg (small desktop):** `gap-6` (24px) - balanced spacing
- **xl (large desktop):** `gap-8` (32px) - original spacing for wide screens

**2. Add nowrap to prevent text wrapping (line 87)**
Ensure navigation text doesn't break:

```tsx
<nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 whitespace-nowrap">
```

### Summary
| Screen Size | Gap | Effect |
|-------------|-----|--------|
| md (768px+) | 16px | Tighter fit for tablets |
| lg (1024px+) | 24px | Balanced desktop spacing |
| xl (1280px+) | 32px | Spacious large screens |

This responsive approach ensures the navigation looks evenly spaced across all device sizes while maintaining readability in both Arabic and English.
