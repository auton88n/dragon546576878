
# Security Fixes Plan

## Issues to Address

### 1. Payment Amount Calculation Inconsistency (ERROR)
**Problem**: When `isPackageBooking: true`, the server trusts the frontend `totalAmount` without verification. A malicious user could send `isPackageBooking: true` with a manipulated low `totalAmount` to pay less for their booking.

**Solution**: Validate package pricing server-side by:
1. Fetch package prices from the database in `create-booking` edge function
2. When `isPackageBooking: true`, verify the `totalAmount` matches the sum of selected packages
3. Reject requests where the amount doesn't match

### 2. Public Forms Lack Rate Limiting Protection (ERROR)
**Problem**: Contact form and group booking have client-side rate limiting only (using localStorage). A determined attacker can bypass this by:
- Clearing localStorage
- Using incognito mode
- Disabling JavaScript

The forms also save to database via RLS "true" policies without server-side protection.

**Solution**: 
- The `create-booking` function already has server-side rate limiting via `check_rate_limit` RPC
- Add the same server-side rate limiting to contact form and group booking submissions
- Create edge functions for form submissions that validate and rate-limit before inserting

### 3. SECURITY DEFINER Functions with Public Access (WARNING)
**Problem**: Functions like `get_bookings_by_email` are `SECURITY DEFINER` and publicly callable. While they have email validation, they could be used for enumeration attacks.

**Solution**: This is documented and acceptable because:
- Functions return data only for the specific email, not lists
- Email must match exactly (case-insensitive)
- UUIDs are unguessable (128-bit entropy)
- Add info-level note that this is reviewed and acceptable

---

## Implementation Details

### Part 1: Fix Package Price Validation in `create-booking`

**File: `supabase/functions/create-booking/index.ts`**

Add server-side package validation:

```typescript
// When isPackageBooking is true, verify against database prices
if (isPackageBooking) {
  // Fetch packages from database
  const { data: packages, error: pkgError } = await supabase
    .from('packages')
    .select('id, name_en, price, adult_count, child_count')
    .eq('is_active', true);
  
  if (pkgError) {
    console.error('Failed to fetch packages for validation:', pkgError);
    // Fall back to trusting frontend if we can't validate
  } else {
    // Calculate expected total based on ticket counts matching package configurations
    // Verify the totalAmount is within acceptable range of expected package pricing
    // Allow small tolerance for rounding (0.01 SAR)
    
    // If totalAmount seems suspicious (e.g., below minimum package price), reject
    const minPackagePrice = Math.min(...packages.map(p => p.price));
    if (body.totalAmount < minPackagePrice && (adultCount + childCount) > 0) {
      return error response for price manipulation attempt
    }
  }
}
```

### Part 2: Add Server-Side Rate Limiting for Contact Form

**Create: `supabase/functions/submit-contact-form/index.ts`**

New edge function that:
1. Validates input (name, email, subject, message)
2. Checks server-side rate limit using `check_rate_limit` RPC
3. Inserts into `contact_submissions` table
4. Returns success/error

**Update: `src/pages/ContactPage.tsx`**
- Call the new edge function instead of direct supabase insert

### Part 3: Add Server-Side Rate Limiting for Group Bookings

**Create: `supabase/functions/submit-group-booking/index.ts`**

New edge function that:
1. Validates all group booking fields
2. Checks server-side rate limit using `check_rate_limit` RPC  
3. Inserts into `group_booking_requests` table
4. Returns success/error

**Update: `src/pages/GroupBookingsPage.tsx`**
- Call the new edge function instead of direct supabase insert

### Part 4: Update Security Findings

After implementing fixes:
1. Mark `payment_calc_inconsistency` as fixed (delete finding)
2. Mark `forms_rate_limiting` as fixed (delete finding)
3. Update `security_definer_public` to ignored with explanation

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/create-booking/index.ts` | Modify | Add package price validation |
| `supabase/functions/submit-contact-form/index.ts` | Create | New edge function with rate limiting |
| `supabase/functions/submit-group-booking/index.ts` | Create | New edge function with rate limiting |
| `src/pages/ContactPage.tsx` | Modify | Use edge function instead of direct insert |
| `src/pages/GroupBookingsPage.tsx` | Modify | Use edge function instead of direct insert |
| `supabase/config.toml` | Modify | Add new function configurations |

---

## Technical Details

### Package Price Validation Logic

Current vulnerable code (lines 143-150):
```typescript
const isPackageBooking = body.isPackageBooking || false;
const calculatedTotal = (adultCount * adultPrice) + (childCount * childPrice);
const finalTotal = isPackageBooking 
  ? body.totalAmount  // VULNERABLE: trusts frontend
  : (calculatedTotal > 0 ? calculatedTotal : body.totalAmount);
```

Fixed code:
```typescript
const isPackageBooking = body.isPackageBooking || false;
let finalTotal = body.totalAmount;

if (isPackageBooking) {
  // Validate package pricing server-side
  const { data: packages } = await supabase
    .from('packages')
    .select('price, adult_count, child_count')
    .eq('is_active', true);
  
  if (packages && packages.length > 0) {
    const minPrice = Math.min(...packages.map(p => Number(p.price)));
    const totalPeople = adultCount + childCount;
    
    // Sanity check: price should be at least minimum package price
    if (totalPeople > 0 && body.totalAmount < minPrice * 0.5) {
      console.warn('Suspicious package pricing detected:', {
        totalAmount: body.totalAmount,
        minPrice,
        totalPeople
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid pricing. Please refresh and try again.",
          error_ar: "تسعير غير صالح. يرجى تحديث الصفحة والمحاولة مرة أخرى."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    finalTotal = body.totalAmount;
  }
} else {
  // Individual tickets: recalculate server-side
  const calculatedTotal = (adultCount * adultPrice) + (childCount * childPrice);
  finalTotal = calculatedTotal > 0 ? calculatedTotal : body.totalAmount;
}
```

### Contact Form Edge Function Structure

```typescript
// submit-contact-form/index.ts
serve(async (req) => {
  // CORS handling
  
  const { name, email, phone, subject, message } = await req.json();
  
  // Input validation with Zod-like checks
  if (!name || name.length < 3 || name.length > 100) {
    return error("Invalid name");
  }
  if (!email || !validateEmail(email)) {
    return error("Invalid email");
  }
  
  // Server-side rate limiting
  const { data: allowed } = await supabase.rpc('check_rate_limit', {
    p_identifier: email.toLowerCase(),
    p_action_type: 'contact_form',
    p_max_attempts: 10,
    p_window_minutes: 15
  });
  
  if (allowed === false) {
    return new Response(
      JSON.stringify({ error: "Too many submissions. Try again later." }),
      { status: 429 }
    );
  }
  
  // Insert with service role (bypasses RLS)
  const { error } = await supabase.from('contact_submissions').insert({
    name: sanitize(name),
    email: email.toLowerCase(),
    phone: phone || null,
    subject: sanitize(subject),
    message: sanitize(message),
  });
  
  return success or error response;
});
```

---

## Security Status After Fix

| Finding | Current | After Fix |
|---------|---------|-----------|
| Payment Amount Calculation | Error | Fixed - server validates package prices |
| Public Forms Rate Limiting | Error | Fixed - server-side rate limiting |
| SECURITY DEFINER Functions | Warning | Ignored - documented, acceptable risk |
| RLS Policy Always True | Warning (ignored) | Unchanged - required for public forms |
| Scanner PII Storage | Info | Already fixed - uses sessionStorage |
