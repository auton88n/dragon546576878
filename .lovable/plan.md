

# Fix Hostinger 404 on Page Refresh — Add `.htaccess` for SPA Routing

## Problem
Your app uses React Router (`BrowserRouter`), so URLs like `/contact`, `/admin`, `/group-bookings` are handled by JavaScript in the browser. But when you **refresh** the page or **type the URL directly**, Hostinger's Apache server tries to find a real file at that path. Since there's no `/contact/index.html` file on disk, Apache returns **404 Not Found**.

The existing `public/_redirects` file is for **Netlify only** — Hostinger ignores it completely. Hostinger uses Apache, which reads `.htaccess` files.

## Solution
Add a single `public/.htaccess` file that tells Apache: *"If the requested URL doesn't match a real file or folder, serve `index.html` instead and let React Router handle it."*

Vite automatically copies everything inside `public/` into the build output (`dist/`), so the file ends up at the root of your deployment without any config changes.

## File to Create

### `public/.htaccess`

```apache
# SPA fallback for React Router on Apache (Hostinger)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Don't rewrite real files or directories (assets, images, favicon, etc.)
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Everything else falls back to index.html so React Router can handle it
  RewriteRule ^ index.html [L]
</IfModule>

# Correct MIME types (helps avoid module/script load issues)
<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType text/css .css
  AddType image/svg+xml .svg
  AddType application/manifest+json .webmanifest
</IfModule>

# Long-term caching for hashed build assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# Never cache index.html (so users always get the latest app version)
<IfModule mod_headers.c>
  <FilesMatch "index\.html$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
```

## How to Deploy to Hostinger

1. After this change is published in Lovable, **rebuild/export** the project (or pull the latest if you're auto-deploying from Git).
2. Upload the contents of the `dist/` folder to your Hostinger `public_html` directory.
3. **Important:** `.htaccess` is a hidden file — make sure your FTP client (FileZilla → View → Show hidden files) or Hostinger File Manager (Settings → Show hidden files) is configured to show and upload it.
4. Confirm `.htaccess` exists in `public_html/` next to `index.html`.

## Testing
1. Visit your site, navigate to `/contact` via the menu — works (it always did).
2. **Refresh the page** while on `/contact` — should now load correctly instead of 404.
3. **Paste `https://yourdomain.com/group-bookings` directly** into a new tab — should load correctly.
4. Try `/admin`, `/my-tickets`, `/about` — all should refresh-safe now.

## Notes
- The existing `public/_redirects` file is harmless to keep (Hostinger ignores it) but is **not** what fixes Hostinger.
- This does not affect Lovable's preview or `.lovable.app` hosting — those already handle SPA fallback automatically.
- No code changes to `App.tsx`, routes, or any component are needed.

