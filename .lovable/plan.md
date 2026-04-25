# Fix Admin Tablet White Screen + Make the App Stable

## Goal
Make the admin dashboard reliable on tablet/mobile and stop the booking/ticket detail area from showing a white screen or feeling laggy. The fix will keep all current functions, but make the UI safer and lighter.

## What I Found
The screenshot shows the admin booking details modal open on a tablet-size viewport. The QR/ticket area is loading, but the modal is heavy and can become unstable on tablets because:

1. `BookingDetailsDialog` renders many sections at once: booking info, tickets/QR images, payment info, email history, orphan payment search, Moyasar verification, refund actions.
2. It also mounts extra async components immediately, especially `EmailStatusTracker`, and `PaymentHistoryPanel` loads when expanded.
3. The QR images load without explicit image sizing/lazy decoding protections.
4. There is no local error boundary around the admin table/dialog. If one admin widget fails on tablet, it can blank the whole admin area instead of showing a controlled error card.
5. `useBookings` has a small bug: it builds `stableFilters` with debounced search, but the query still reads the original `filters.search`, which can cause extra queries and re-renders while typing.
6. The admin page still uses a wide horizontal tab list; on tablet this creates pressure/overflow and contributes to the “white/laggy” feel.

## Implementation Plan

### 1. Add safety wrapper around admin panels
- Wrap the bookings tab, details dialog, and lazy admin panels with `ErrorBoundary`.
- If a panel fails, show a clean bilingual error card with “Try again / حاول مرة أخرى” instead of a blank white screen.
- This prevents one broken widget from taking down the whole `/admin` page.

### 2. Stabilize `BookingDetailsDialog`
- Add an explicit ticket-loading error state.
- If tickets fail to load, show a friendly retry panel instead of an empty/white section.
- Make the QR grid tablet-safe:
  - use `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
  - add `max-w-full`, `object-contain`, `loading="lazy"`, `decoding="async"`
  - constrain long ticket codes with `break-all`/`truncate`
- Reduce heavy visual effects inside the modal on tablet.
- Keep the same buttons: resend email, mark paid, cancel, generate tickets, verify payment, refund.

### 3. Lazy-load heavy detail sections only when needed
- Keep critical details visible immediately: customer, booking timeline, tickets, QR, payment status.
- Move heavier admin-only sections behind collapsible panels:
  - Email History
  - Moyasar Verification
  - Find Lost Payment
- `EmailStatusTracker` should mount only when its section is opened, not every time the booking dialog opens.
- `PaymentHistoryPanel` already sits inside a collapsible; keep that behavior.

### 4. Fix bookings hook query stability
- Update `useBookings` so the Supabase query uses `stableFilters` / debounced search instead of raw `filters.search`.
- Track fetch errors and return `error` from the hook.
- Prevent stale requests from overwriting newer results if filters/page change quickly.
- Keep pagination at 20 items per page.

### 5. Improve booking table tablet performance
- Remove remaining expensive per-row effects:
  - `animate-pulse` on repeated badges
  - extra `backdrop-blur-sm`
  - unnecessary row transitions on large tables
- Keep the mobile card layout for smaller tablets/phones.
- For tablet widths, make the table wrapper more explicit with horizontal scroll and safe widths so it never creates full-page overflow.

### 6. Make admin navigation tablet-friendly
- Replace the current centered horizontal `TabsList` with a responsive navigation layout:
  - desktop/tablet: compact scrollable nav bar or sidebar-compatible layout
  - mobile/tablet narrow widths: horizontal scroll chips that do not overflow the screen
- This is a smaller stabilizing step; it will not remove any tabs or functions.

### 7. Add admin loading/error states
- Bookings tab should show:
  - skeleton while loading
  - empty state when no data
  - error state with retry button if Supabase fails
- Stalled payments alert should fail silently and not block the dashboard.

## Files to Update

| File | Change |
|---|---|
| `src/hooks/useBookings.ts` | Debounced query fix, error state, stale-request protection |
| `src/pages/AdminPage.tsx` | Add panel error boundaries, responsive nav/table wrappers, pass booking errors |
| `src/components/admin/BookingTable.tsx` | Reduce animations/effects, safer tablet layout, error-friendly table rendering |
| `src/components/admin/BookingDetailsDialog.tsx` | Ticket error state, lazy heavy sections, QR image safety, tablet-safe modal layout |
| `src/components/shared/ErrorBoundary.tsx` | Reuse/extend fallback for admin panels if needed |

## Expected Result
- `/admin` no longer goes white on tablet.
- Booking/ticket details modal opens faster and stays stable.
- QR/ticket area always shows either QR codes, loading skeletons, an empty state, or a retryable error — never a blank white area.
- Booking table scrolls and responds smoothly on tablet.
- All existing admin functions remain available.