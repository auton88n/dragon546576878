
## Goal
Fix the “large empty space on the left / content pushed to the far right” issue that happens **only in Arabic (RTL)** on **Contact** and **Corporate/Company Bookings** pages.

## What I found (why it happens only in Arabic)
Both **ContactPage** and **GroupBookingsPage** include a “honeypot” anti-spam input that is hidden like this:

```tsx
className="absolute -left-[9999px] opacity-0 pointer-events-none"
```

That huge negative `left` can create an extremely wide invisible layout area. On many browsers you won’t notice it, but on some **tablet browsers in RTL mode**, the page can start at the “rightmost” horizontal scroll position. The result looks exactly like what you described:
- big blank space on the left
- the real content appears squeezed to the far right
- switching to English (LTR) “fixes” it because LTR scroll origin behavior differs

This also explains why the **homepage works**: it doesn’t have an element pushed 9999px off-screen.

## Solution (clean + proven)
Keep the honeypot feature, but hide it using a method that **does not create horizontal overflow**.

### Change approach
Replace the honeypot’s `-left-[9999px]` technique with Tailwind’s built-in `sr-only` (screen-reader-only) utility, which hides without creating a giant offscreen box.

This is the safest, simplest fix and aligns with your request to keep things clean and avoid “hacky” layout workarounds.

## Exact code changes to make

### 1) Contact page
File: `src/pages/ContactPage.tsx`

Find the honeypot input and change:

**FROM**
```tsx
className="absolute -left-[9999px] opacity-0 pointer-events-none"
```

**TO**
```tsx
className="sr-only"
```

(We keep the existing `tabIndex={-1}` and `aria-hidden="true"`.)

### 2) Corporate/Company bookings page
File: `src/pages/GroupBookingsPage.tsx`

Do the same honeypot change:

**FROM**
```tsx
className="absolute -left-[9999px] opacity-0 pointer-events-none"
```

**TO**
```tsx
className="sr-only"
```

## Why this should fix the RTL spacing instantly
- Removes the main source of **accidental horizontal overflow**
- Prevents RTL browsers from “starting” the page at a weird horizontal scroll offset
- Keeps spam protection intact
- No transforms, no hardware acceleration, no WebKit-specific hacks

## Testing checklist (important)
1. On the actual tablet (the one showing the bug), switch to **Arabic**.
2. Open:
   - `/contact`
   - `/group-bookings`
3. Confirm:
   - No empty-left spacing
   - Content is centered normally
   - No horizontal “shift” after load
4. Rotate tablet (portrait/landscape) and re-check.
5. Submit each form once to ensure nothing broke:
   - Normal submission still works
   - Honeypot still blocks submissions if filled

## If it still happens after this (fallback plan)
If your tablet still shows spacing after removing the 9999px offscreen element, the next likely culprit would be another element causing horizontal overflow in RTL (e.g., a wide popover/calendar). In that case, we’ll:
- quickly identify the overflowing element (by temporarily highlighting overflow in dev)
- apply a targeted fix (like `max-w-full`, `overflow-x-clip` on a specific wrapper, or constraining the popover width)
But the honeypot fix is the highest-probability cause because it appears in exactly the two pages that break.
