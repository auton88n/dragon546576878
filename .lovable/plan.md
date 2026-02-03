
# Fix: Contact and Group Bookings Pages - Tablet Layout Issue

## Problem Summary
On tablet devices (landscape orientation, 1024px-1366px), the Contact Us and Corporate Bookings pages display incorrectly:
- **Right side** (contact info cards, map, footer) renders correctly
- **Left side** (contact form) appears completely blank/white
- The page loads successfully, only the layout is broken

## Root Cause Analysis

### Current Layout Structure (ContactPage.tsx)
```tsx
<section className="py-16">
  <div className="container max-w-7xl mx-auto">  // Missing px-4 padding
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
      <Card className="... order-2 md:order-1">   // Contact Form
      <div className="... order-1 md:order-2">    // Contact Info + Map
```

### Identified Issues

1. **Missing Container Padding**: The main content container uses `container max-w-7xl mx-auto` but lacks explicit `px-4` padding. On tablets, this can cause content to hit the edges and potentially collapse.

2. **Order Swapping Confusion**: Using `order-2 md:order-1` and `order-1 md:order-2` may cause rendering issues on some tablet browsers, especially with CSS Grid.

3. **Container Max-Width Mismatch**: The `max-w-7xl` (1280px) combined with the Tailwind container config (`2xl: 1400px`) creates an inconsistency. On iPad landscape (1024px), the container should be fine, but the grid children might not have explicit widths.

4. **Missing `min-w-0` on Grid Children**: CSS Grid items can overflow their containers without `min-w-0`, causing one column to push another off-screen.

## Solution

### Fix 1: Add Explicit Padding and Width Constraints

**ContactPage.tsx** - Update the main content container:
```tsx
// Current
<div className="container max-w-7xl mx-auto">

// Fixed
<div className="container max-w-7xl mx-auto px-4">
```

### Fix 2: Add `min-w-0` to Grid Children

Prevent grid items from overflowing:
```tsx
// Current
<Card className="border-border/50 shadow-lg order-2 md:order-1">

// Fixed
<Card className="border-border/50 shadow-lg order-2 md:order-1 min-w-0">

// Current
<div className="space-y-6 lg:space-y-8 order-1 md:order-2">

// Fixed
<div className="space-y-6 lg:space-y-8 order-1 md:order-2 min-w-0">
```

### Fix 3: Remove Order Swapping on Tablets

The order swapping is causing visual confusion. For a cleaner layout on tablets:
- Keep form first (natural order) on all screen sizes
- This simplifies the CSS and prevents potential rendering bugs

```tsx
// Remove order classes entirely for simpler layout
<Card className="border-border/50 shadow-lg min-w-0">
<div className="space-y-6 lg:space-y-8 min-w-0">
```

### Fix 4: Apply Same Fixes to GroupBookingsPage

The same container and grid issues exist in GroupBookingsPage. Apply:
- Add `px-4` to containers
- Add `min-w-0` to grid children where applicable

## Files to Modify

1. **src/pages/ContactPage.tsx**
   - Add `px-4` to main content container (line 144)
   - Add `min-w-0` to both grid children (lines 147, 213)

2. **src/pages/GroupBookingsPage.tsx**
   - Add `px-4` to section containers (lines 231, 251)
   - Add `min-w-0` to benefit cards grid children if needed

## Technical Details

### Why `min-w-0` Works
In CSS Grid/Flexbox, the default `min-width: auto` can cause items to refuse to shrink below their content size. Adding `min-w-0` allows items to shrink properly within the grid, preventing one column from pushing another off-screen.

### Why `px-4` is Needed
The Tailwind `container` class uses responsive padding from the config, but combined with `max-w-7xl`, the explicit padding may be overridden. Adding `px-4` ensures consistent horizontal padding on all screen sizes.

### Tablet Viewport Reference
- iPad (landscape): 1024px x 768px
- iPad Pro 11" (landscape): 1194px x 834px  
- iPad Pro 12.9" (landscape): 1366px x 1024px

All these use `md:grid-cols-2` (triggers at 768px) so the 2-column layout should activate.

## Testing Checklist
After implementation:
- Test `/contact` on iPad landscape (1024x768) - both languages
- Test `/contact` on iPad Pro landscape (1366x1024) - both languages
- Test `/group-bookings` on same tablet viewports
- Verify form column is visible on left
- Verify contact info/map column is visible on right
- Test RTL (Arabic) layout on tablets
- Confirm no horizontal scrolling occurs
