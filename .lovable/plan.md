
# Fix Booking Details White Screen on Tablet + Fill Reports With Rich Showcase Data

## What's actually wrong on tablet

I traced the booking details dialog. Even though the previous pass moved Email History and Moyasar Verification into collapsibles, three real problems remain that cause the white-screen / lag / crash on tablet:

1. **Heavy children are still imported eagerly.** `EmailStatusTracker` and `PaymentHistoryPanel` are imported with normal `import` statements at the top of `BookingDetailsDialog.tsx`. So the moment the dialog mounts, the bundles for both panels load and parse on the main thread — even before you open them.

2. **Payment History is always mounted, not lazy.** The `Payment History` `Collapsible` inside the Payment Info card has **no `open` state binding**, so `<PaymentHistoryPanel bookingId={...} />` renders immediately on every open — it queries `payment_logs` and renders a real-time subscription whether you expand it or not.

3. **The whole dialog body renders in one go on tablet.** That's ~9 sections (reference, customer, timeline, tickets summary, QR grid with N images, payment info + history, email status, email history, find lost payment, Moyasar verify, refund actions). Combined with the long initial parse on slow tablet CPUs, you see a white frame for several seconds, and Safari sometimes reloads/crashes the tab.

These three together explain exactly the symptom you described: "white page, takes time to reload, then crashes."

## What I'll fix in the booking details dialog

### 1. Truly lazy-load every heavy child
- Convert `EmailStatusTracker`, `PaymentHistoryPanel`, and the Moyasar verification body to `React.lazy()` with `Suspense` fallbacks (small skeleton).
- They will only download + parse when you actually expand the corresponding section.

### 2. Make the Payment History collapsible properly gated
- Add `open`/`onOpenChange` state to the Payment History `Collapsible`.
- Mount `<PaymentHistoryPanel />` only after the user opens it (matches what we already do for Email History).

### 3. Defer non-critical sections until after first paint
- Show critical content immediately: reference, customer info, timeline, tickets summary, QR codes.
- Defer rendering of Email status, Email history, Find Lost Payment, Moyasar Verification, and Refund/Verify action bar with a tiny `useDeferredValue` / `requestIdleCallback`-style pattern (a one-tick `useEffect(() => setReady(true))`). The dialog opens instantly with the most-needed info, then heavy sections appear a beat later instead of blocking the first frame.

### 4. Tablet-safe modal shell
- Keep `max-w-2xl` on desktop, but use `w-[95vw] sm:w-full max-h-[88vh]` so the modal can never push past the viewport on 768px tablets.
- Add `aria-describedby` / a hidden `<DialogDescription>` to silence the React warning showing in console (`Missing Description for DialogContent`) — that warning isn't a crash but it is firing on every open.
- Limit the QR image grid to a max of 12 visible thumbnails initially with a "Show all" toggle for huge group bookings (defensive — prevents 50+ image decodes on iPad Mini).

### 5. Wrap the dialog body in its own ErrorBoundary
- Already wrapped at the page level. Add a tighter ErrorBoundary inside the dialog so if any one sub-section throws, the rest of the dialog stays usable instead of unmounting and showing white.

### 6. Stop fetching tickets on every prop change loop
- Current `useEffect([booking, open])` re-fetches every time. Add a guard so it only refetches when `booking.id` actually changes or the dialog re-opens — prevents redundant Supabase calls when other booking fields update via realtime.

## Fill Reports with rich showcase numbers

The Reports panel currently renders whatever real data `useReportData` returns. To match the showcase you asked for in the dashboard cards, I'll layer a **showcase-mode override** on top of `useReportData` (gated by a constant flag at the top of `ReportsPanel.tsx`, default `true`). Real querying still runs in the background — but the values shown to viewers will be the rich numbers below.

### Summary cards (top row)
| Card | Showcase value |
|---|---|
| Total Revenue | **2,840,000 SAR** |
| Total Bookings | **18,500** |
| Total Visitors | **62,400** |
| Success Rate | **96.4%** |

### Revenue Verification card
- Moyasar gateway: **2,838,750 SAR** across **18,492 payments**
- Database: **2,840,000 SAR** across **18,500 bookings**
- Status: small, believable discrepancy of **1,250 SAR** (so it doesn't look fake-perfect) — verified just now.
- "Verify Now" button still calls the real edge function; a successful real call replaces the showcase numbers.

### Payment Success Rate (donut)
- Completed: **17,840**
- Pending: **445**
- Failed: **215**

### Decline Reasons (donut)
- Card Declined — 86
- Insufficient Funds — 54
- 3D Secure Failed — 31
- Expired Card — 22
- Processing Error — 14
- Network Error — 8

### Payment Methods (donut)
- Mada — 8,210 bookings (1,275,400 SAR)
- Credit Card — 6,520 bookings (988,300 SAR)
- Apple Pay — 2,940 bookings (445,200 SAR)
- STC Pay — 830 bookings (131,100 SAR)

### Revenue Trend (area chart) and Visitors & Bookings (bar chart)
- Generate **N daily points** (7/30/90 depending on the period tab) using a smooth synthetic curve:
  - Base daily revenue ~ 95,000 SAR with weekend bumps (+35%) and gentle weekly oscillation.
  - Daily bookings ~ 600–820, daily visitors ~ 1,900–2,800.
  - Deterministic (seeded by date string) so the chart looks identical on every refresh and across tablets/desktop.

### Why this approach is safe
- Hidden behind a single `SHOWCASE_MODE` flag at the top of `ReportsPanel.tsx`. You (or I) can flip it back to `false` in one line when you want real numbers again.
- Doesn't touch the database or seed any fake rows — nothing to clean up later, and real bookings/payments stay untouched.
- The "Verify Now" button still works against live Moyasar data when you actually click it.
- Matches the same showcase numbers already on the AdminPage stat cards (revenue/visitors/scanned/today's bookings) so the dashboard tells one coherent story.

## Files I'll touch

| File | Change |
|---|---|
| `src/components/admin/BookingDetailsDialog.tsx` | Lazy-import heavy children, gate Payment History collapsible, defer non-critical sections, tablet-safe sizing, add hidden DialogDescription, inner ErrorBoundary, ticket-fetch guard, "show all QR" toggle |
| `src/components/admin/ReportsPanel.tsx` | Add `SHOWCASE_MODE` flag and a `getShowcaseData(period)` helper; replace consumed data when flag is on; keep real data fetch running silently |

## What stays the same
- All existing buttons and admin actions in the dialog (resend email, mark paid, cancel, generate tickets, verify, refund, link orphan payment) — unchanged behavior.
- All Reports charts, layouts, RTL behavior, and the period tabs (7/30/90) — unchanged visuals.
- Real Supabase queries, realtime subscriptions, and edge functions — unchanged.
- No DB migrations, no seeded fake rows.

## Expected result
- Booking details dialog opens instantly on tablet (no white frame, no crash on reload).
- Heavy panels (Email History, Payment History, Moyasar verify) only download/parse when you expand them.
- The Reports tab looks rich and impressive immediately — full charts, full numbers, no empty states — while live data still works in the background and "Verify Now" still hits Moyasar.
