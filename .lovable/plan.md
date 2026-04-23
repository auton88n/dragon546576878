

# Make the App Fast — Fix Heavy Images + Render Bottlenecks

## Diagnosis (what's actually slowing the app down)

I checked your assets and config. The app feels heavy mostly because of **oversized images**, not your React code. Here's what I found:

| File | Current size | Should be |
|---|---|---|
| `src/assets/feature-tours.webp` | **1.9 MB** | ~80 KB |
| `src/assets/hero-heritage.webp` | **1.8 MB** | ~200 KB |
| `public/images/about-hero-tuwayq.webp` | **1.8 MB** | ~200 KB |
| `src/assets/feature-family.webp` | **1.7 MB** | ~80 KB |
| `src/assets/package-large-family.webp` | **1.6 MB** | ~80 KB |
| `src/assets/feature-heritage.webp` | **1.4 MB** | ~80 KB |
| `src/assets/package-*.webp` (×4) | ~5 MB combined | ~300 KB total |

Total image weight on the homepage alone is **~7 MB**. On a phone over 4G this is several seconds of waiting + heavy decoding work that locks the main thread.

Two more contributors:
1. **Moyasar payment SDK loads on every page** (homepage included) from `index.html` even though it's only needed on `/pay/:bookingId`.
2. **Two hero images preloaded eagerly** in `index.html` — even when you're on a page that doesn't use them.

## Plan

### 1. Re-compress all heavy images (biggest win)
Re-encode the WebP files with proper quality + max-width. Targets:
- Hero images: max 1920px wide, quality 75 → ~150–250 KB each
- Feature/package cards: max 800px wide, quality 75 → ~50–100 KB each

Will also add a 2x WebP version for retina (no-op on older devices).

Expected: page weight drops from ~7 MB to **under 1 MB**.

### 2. Stop loading the Moyasar SDK on every page
Remove the `<script>` and `<link>` for Moyasar from `index.html`. The project already has `src/lib/loadMoyasarSdk.ts` which can inject it on demand on the payment page only.

Saves ~200 KB JS + a CSS file + a render-blocking script tag from every page load.

### 3. Trim eager preloads in `index.html`
- Keep `hero-heritage-new.webp` preloaded (it's used above the fold on `/`).
- Remove the eager preload of `about-hero-tuwayq.webp` (only used on `/about`).

### 4. Tiny render-side improvements
- Add `width`/`height` attributes on the hero image and feature images so the browser reserves space → no layout shift, faster paint.
- Replace `min-h-screen` hero with a fixed responsive height so first paint isn't waiting on viewport calc.
- Memoize the `features` array in `Index.tsx` so it doesn't re-create on every render.

## What stays the same
- All visuals, layouts, animations, RTL behavior — unchanged.
- All functionality (booking, payment, admin, scanner) — unchanged.
- Image quality at normal viewing sizes will look identical; only the file size shrinks.

## Files I'll touch
| File | Change |
|---|---|
| `src/assets/*.webp` (8 files) | Re-encode smaller |
| `public/images/hero-heritage-new.webp`, `about-hero-tuwayq.webp`, `hero-booking.webp`, `hero-contact.webp` | Re-encode smaller |
| `index.html` | Remove Moyasar SDK + extra preload |
| `src/lib/loadMoyasarSdk.ts` | Confirm it injects SDK on demand (already does — verify) |
| `src/pages/PaymentPage.tsx` / `DetailsAndPayment.tsx` | Ensure they call `loadMoyasarSdk()` before mounting form |
| `src/pages/Index.tsx` | Memoize features, add explicit dimensions |

## Expected result
- Homepage payload: **~7 MB → ~800 KB**
- First Contentful Paint on 4G: **~4–6s → ~1.5s**
- No more "heavy/laggy" feeling on scroll and page transitions
- Payment page still works exactly the same (SDK loads when you arrive there)

