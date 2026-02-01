
## Fix Navigation Menu Visual Balance

### Problem Analysis
The navigation appears visually uneven due to:
1. **`justify-between` layout** pushes logo, nav, and actions to fill the container width
2. **Navigation is not centered** - it sits between logo and actions, but not in the true center of the header
3. **No consistent spacing** between logo/nav and nav/actions sections

### Solution
Change the header layout to use **absolute positioning** for the navigation, centering it in the header while keeping logo and actions on the sides. This ensures perfect visual balance regardless of text length variations.

### File to Modify
`src/components/shared/Header.tsx`

### Changes

**1. Update the header container layout (line 80)**
Change from `justify-between` to use `relative` positioning:

```tsx
// Current:
<div className="container flex h-16 md:h-20 items-center justify-between">

// Fixed - add relative for absolute nav positioning:
<div className="container relative flex h-16 md:h-20 items-center justify-between">
```

**2. Center the navigation absolutely (line 87)**
Position the nav in the absolute center of the header:

```tsx
// Current:
<nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 whitespace-nowrap">

// Fixed - absolute center positioning:
<nav className="hidden md:flex items-center gap-4 lg:gap-6 xl:gap-8 whitespace-nowrap absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
```

### Result
| Element | Position | Effect |
|---------|----------|--------|
| Logo | Left (RTL: Right) | Fixed position |
| Navigation | **Center (absolute)** | Perfectly centered in viewport |
| Actions | Right (RTL: Left) | Fixed position |

This ensures the navigation is always visually centered, creating a balanced appearance regardless of individual item text lengths or the widths of the logo/actions sections.
