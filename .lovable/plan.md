
# Fix for Contact Us and Corporate Bookings Pages - "Small in Corner" Layout Issue

## Problem Identified
The Contact Us (`/contact`) and Corporate Bookings (`/group-bookings`) pages display content squeezed into a small area on the right side of the screen on tablet devices, leaving a large white/blank area on the left.

## Root Cause
There are two issues causing this layout problem:

### 1. Conflicting CSS in App.css (Primary Cause)
The file `src/App.css` contains Vite's default boilerplate CSS that sets:
```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
```
This conflicts with the proper full-width layout. While `App.css` is not imported in the main app, it may still be processed by Vite and cause unexpected behavior.

### 2. Missing Page Structure Classes
The `ContactPage.tsx` and `GroupBookingsPage.tsx` are missing the `flex flex-col` wrapper that's present in `Index.tsx` (which works correctly).

**Working page (Index.tsx):**
```tsx
<div className="min-h-screen flex flex-col bg-background ...">
```

**Broken pages:**
```tsx
<div className="min-h-screen bg-background" dir={...}>
```

## Technical Implementation

### Step 1: Clean up App.css
Remove or reset the conflicting styles in `src/App.css`. Replace the entire content with minimal/empty CSS since all styling is handled through Tailwind and `index.css`.

### Step 2: Update ContactPage.tsx
Add `flex flex-col w-full` to the root container to ensure proper full-width layout.

**Before:**
```tsx
<div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

**After:**
```tsx
<div className="min-h-screen flex flex-col w-full bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

### Step 3: Update GroupBookingsPage.tsx  
Apply the same structural fix to the Corporate Bookings page.

**Before:**
```tsx
<div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

**After:**
```tsx
<div className="min-h-screen flex flex-col w-full bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
```

## Files to Modify
1. `src/App.css` - Reset to empty/minimal styles
2. `src/pages/ContactPage.tsx` - Add `flex flex-col w-full` to root container
3. `src/pages/GroupBookingsPage.tsx` - Add `flex flex-col w-full` to root container

## Why This Fixes the Issue
- Removing the `max-width: 1280px` and `padding: 2rem` from `#root` allows the app to use the full viewport width
- Adding `flex flex-col w-full` ensures the page content stretches to fill the available width
- This matches the structure of the working Index page

## Testing
After implementation, test on:
- Tablet Chrome (normal browser tab) in both Arabic and English
- Desktop browsers
- Mobile devices

Verify that the Contact Us and Corporate Bookings pages now fill the entire screen width without blank areas.
