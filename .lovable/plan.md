
# Fix 404 Errors on Direct Route Access

## Problem
When users navigate directly to `/contact` or `/group-bookings` (by typing the URL or refreshing the page), the server returns a 404 error because there is no physical file at those paths. The server doesn't know to serve `index.html` and let React Router handle the routing.

## Root Cause
This is a standard Single Page Application (SPA) routing issue. The React app uses client-side routing (React Router), but when a user directly accesses a URL like `/contact`:

1. Browser requests `/contact` from the server
2. Server looks for a file at `/contact/index.html` or `/contact.html`
3. No such file exists - server returns 404
4. React Router never gets a chance to handle the route

## Solution
Add a `_redirects` file in the `public/` folder that tells the hosting server to redirect all non-file requests to `index.html`, allowing React Router to handle routing.

## Technical Implementation

### File to Create

**`public/_redirects`**
```text
/*    /index.html   200
```

This single-line configuration:
- Matches all routes (`/*`)
- Serves `index.html` instead
- Returns HTTP status 200 (not 301/302 redirect)
- Allows React Router to handle all client-side routes

### Why This Works
- The `_redirects` file is recognized by Lovable's hosting infrastructure
- It acts as a "catch-all" rule for any route that doesn't match a physical file
- Static assets (JS, CSS, images) still load normally because they exist as actual files
- All other paths serve `index.html`, which bootstraps React and React Router

### PWA Consideration
The project already has `navigateFallback: 'index.html'` in the PWA/Workbox config (line 47 of `vite.config.ts`), which helps with offline routing. However, this only works after the service worker is installed. The `_redirects` file handles the initial server-side routing.

## Files to Create
1. `public/_redirects` - SPA fallback routing configuration

## Testing After Implementation
1. Click **Publish → Update** to deploy the changes
2. Clear browser cache or use Incognito mode
3. Navigate directly to `https://[your-domain]/contact` - should load Contact page
4. Navigate directly to `https://[your-domain]/group-bookings` - should load Group Bookings page
5. Refresh the page on any route - should stay on same page (not 404)
6. All other routes should continue working normally
