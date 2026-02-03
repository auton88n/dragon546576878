

# Remove Tablet CSS Fixes Causing Zoom-Out Bug

## Problem

The hardware acceleration and CSS Grid fixes we added are causing a massive zoom-out bug on real tablets, making content microscopic and unusable.

## What Will Be Removed

### 1. Remove Tablet Media Query from index.css (lines 46-65)

Delete this entire block:
```css
/* Tablet-specific CSS Grid fixes (768px - 1366px) */
@media (min-width: 768px) and (max-width: 1366px) {
  .grid {
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: grid;
  }
  
  .grid > * {
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }
}
```

### 2. Remove Hardware Acceleration Inline Styles

**ContactPage.tsx** - Remove `style={{ transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}` from:
- Line 154: Info cards grid
- Line 223: Form fields grid (name/email)
- Line 251: Form fields grid (phone/subject)

**GroupBookingsPage.tsx** - Remove from:
- Line 248: Benefits grid
- Line 354: Form fields grid (email/phone)

### 3. Keep the Simpler Breakpoints

These stay unchanged:
- `lg:grid-cols-2` for form fields (already correct)
- `md:grid-cols-2 lg:grid-cols-5` for benefits (already correct)

## What Will Be Added

The user's message was cut off before they could specify the simple CSS fix they wanted. I'll wait for them to provide that, or I can proceed with just the removals which should fix the zoom-out issue.

## Files to Modify

| File | Action |
|------|--------|
| `src/index.css` | Remove lines 46-65 (tablet media query) |
| `src/pages/ContactPage.tsx` | Remove inline style props from 3 grid containers |
| `src/pages/GroupBookingsPage.tsx` | Remove inline style props from 2 grid containers |

## Result

After these changes, tablets will display:
- Normal zoom level (no microscopic content)
- Single-column layouts on portrait tablets (safe default)
- Two-column layouts only on larger screens (1024px+)

