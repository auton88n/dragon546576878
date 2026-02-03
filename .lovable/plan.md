

# Switch to HashRouter for Universal Compatibility

## Overview

Replace `BrowserRouter` with `HashRouter` in `src/App.tsx` to enable client-side routing without requiring server-side configuration. This is a temporary workaround that ensures all routes work correctly regardless of hosting configuration.

## How URLs Will Change

| Current (BrowserRouter) | New (HashRouter) |
|------------------------|------------------|
| `almufaijer.com/contact` | `almufaijer.com/#/contact` |
| `almufaijer.com/group-bookings` | `almufaijer.com/#/group-bookings` |
| `almufaijer.com/book` | `almufaijer.com/#/book` |
| `almufaijer.com/admin` | `almufaijer.com/#/admin` |

## Why This Works

- **No server config needed**: Hash-based routing (`#/path`) is handled entirely by the browser
- **Works on any host**: Static file servers, CDNs, and misconfigured servers all work
- **Same React Router API**: All existing `<Link>`, `useNavigate()`, and route definitions remain unchanged

## Implementation

**File: `src/App.tsx`**

1. Update import statement:
   ```tsx
   // Change from:
   import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
   
   // To:
   import { HashRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
   ```

2. Replace router component:
   ```tsx
   // Change from:
   <BrowserRouter>
     ...
   </BrowserRouter>
   
   // To:
   <HashRouter>
     ...
   </HashRouter>
   ```

## Trade-offs

| Pros | Cons |
|------|------|
| Works immediately without DNS/server changes | URLs contain `#` (less clean) |
| Zero server configuration required | Slightly worse for SEO (not critical for this app) |
| Compatible with all hosting providers | Hash portion not sent to server in analytics |
| Easy to revert later | Social sharing links look less professional |

## Reverting Later

Once the domain is properly configured with the `_redirects` file working, you can switch back to `BrowserRouter` for cleaner URLs. The change is a simple 2-line modification in either direction.

