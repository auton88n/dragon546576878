
## Fix Navigation Overlap on Tablets

### Problem
On tablet screens (768px - 1024px), the absolutely centered navigation overlaps with the action buttons on the left side. This is because:
1. The navigation has 6 items with Arabic text that takes significant width
2. The desktop layout shows at `md` (768px), but there isn't enough horizontal space
3. The absolute centering doesn't account for the space needed by logo and actions

### Solution
Raise the breakpoint for showing desktop navigation from `md` (768px) to `lg` (1024px). Tablets will use the mobile hamburger menu, which provides a better user experience for that screen size.

### Changes to `src/components/shared/Header.tsx`

**1. Change desktop navigation visibility (line 87)**
- From: `hidden md:flex`
- To: `hidden lg:flex`

**2. Change desktop actions visibility (line 103)**
- From: `hidden md:flex`  
- To: `hidden lg:flex`

**3. Change mobile menu visibility (line 118)**
- From: `flex md:hidden`
- To: `flex lg:hidden`

**4. Change mobile menu dropdown visibility (line 135)**
- From: `md:hidden`
- To: `lg:hidden`

### Summary

| Screen Size | Layout | Behavior |
|-------------|--------|----------|
| < 1024px (mobile + tablet) | Hamburger menu | Clean, no overlap |
| ≥ 1024px (desktop) | Full navigation | Centered, balanced |

This ensures tablets use the mobile menu, which is actually a better UX for that screen size given the number of navigation items.
