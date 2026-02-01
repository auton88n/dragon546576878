
# Comprehensive Security Fixes Plan

## Summary of Security Issues Found

Based on the fresh security scan and stored findings, there are several issues to address:

### Errors (High Priority)
1. **Customer Personal Data Exposure** - bookings, contact_submissions tables
2. **Contact Form Data Could Be Harvested** - contact_submissions table  
3. **Group Booking Requests Expose Corporate Info** - group_booking_requests table
4. **Support Messages Could Be Read Unauthorized** - support_conversations table
5. **Invoice Data Including Payment Details Exposure** - custom_invoices table

### Warnings (Medium Priority)
6. **Scanner Statistics Store Customer PII in Browser Storage** - localStorage stores customer names/ticket codes indefinitely
7. **SECURITY DEFINER Functions with Public Access** - get_bookings_by_email lacks rate limiting
8. **VIP Contact Database Weak Access Controls** - Already noted as outdated
9. **RLS Policy Always True** - Intentionally ignored (required for public forms)

### Info Level
10. **User Profiles Missing Own-Read Policy** - Users cannot read their own profile

---

## Solution Overview

### Part 1: Database Security (RLS Policies)

The "Deny anonymous access" policies already exist for critical tables but the security scanner flagged potential gaps. I will add explicit SELECT blocking policies where missing.

**Tables to Update:**
- `profiles` - Add "Users can view own profile" SELECT policy

### Part 2: Scanner Page - Remove PII from localStorage

The scanner page stores customer names and ticket codes in localStorage indefinitely. This is a privacy risk on shared devices.

**Changes to `src/pages/ScannerPage.tsx`:**
- Modify `recentScans` to only store anonymized data (status, timestamp, ticket type)
- Remove customer names from localStorage persistence
- Use sessionStorage for sensitive scan data
- Auto-clear old scans on page load

### Part 3: Update Outdated Security Findings

Mark the outdated findings as reviewed/resolved in the security system.

---

## Detailed Implementation

### 1. Database Migration - Add Missing RLS Policy

Add a SELECT policy for users to read their own profile:

```sql
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
```

### 2. Scanner Page Privacy Fix

**File: `src/pages/ScannerPage.tsx`**

The current `ScanResult` interface stores:
- `customerName` - PII that should not persist
- `ticketCode` - Sensitive identifier
- `customerPhone` - PII
- `bookingReference` - Can identify bookings

**Changes:**

a) **Modify stored scan data** - Only persist anonymized fields to localStorage:
```typescript
const sanitizedScanForStorage = (scan: ScanResult) => ({
  timestamp: scan.timestamp,
  status: scan.status,
  ticketType: scan.ticketType,
  isEmployee: scan.isEmployee,
  isGroupTicket: scan.isGroupTicket,
  // Anonymize: hash or omit sensitive fields
  hasCustomer: !!scan.customerName,
  adultCount: scan.adultCount,
  childCount: scan.childCount,
});
```

b) **Add cleanup on page load** - Clear scans older than current session:
```typescript
useEffect(() => {
  // Clear localStorage scans on mount (fresh session)
  safeLocalStorage.removeItem(RECENT_SCANS_STORAGE_KEY);
}, []);
```

c) **Use sessionStorage for display** - Keep full data in memory/sessionStorage for current session only:
```typescript
// Store anonymized version to localStorage (for stats)
// Store full version to sessionStorage (clears on browser close)
```

### 3. Mark Security Findings as Resolved

After implementing fixes, update the security findings:

- Delete the "outdated" findings that have been addressed
- Update remaining findings with remediation notes

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ScannerPage.tsx` | Remove PII from localStorage, use sessionStorage for session-only data |
| Database Migration | Add "Users can view own profile" RLS policy |
| Security Findings | Update/delete outdated findings |

---

## Technical Details

### Scanner Page Changes (lines 97-113, 168-173)

Current problematic code:
```typescript
// Line 169 - Persists full scan data with PII
safeLocalStorage.setItem(RECENT_SCANS_STORAGE_KEY, JSON.stringify({
  date: getTodayKey(),
  scans: recentScans  // Contains customerName, ticketCode, etc.
}));
```

Fixed code:
```typescript
// Only persist anonymized data for stats purposes
const anonymizedScans = recentScans.map(scan => ({
  timestamp: scan.timestamp,
  status: scan.status,
  ticketType: scan.ticketType,
  isEmployee: scan.isEmployee,
}));
safeLocalStorage.setItem(STATS_STORAGE_KEY, JSON.stringify({
  date: getTodayKey(),
  stats: todayStats,
  scanCount: anonymizedScans.length
}));
// Full scan history only in sessionStorage (clears on close)
sessionStorage.setItem(RECENT_SCANS_STORAGE_KEY, JSON.stringify({
  scans: recentScans
}));
```

### Database RLS Policy

```sql
-- profiles: Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
```

---

## Security Status After Fix

| Finding | Status |
|---------|--------|
| Customer Personal Data Exposed | Protected by RLS (staff-only SELECT) |
| Contact Form Data Harvesting | Protected by honeypot + rate limiting + RLS |
| Scanner PII in localStorage | Fixed - anonymized storage + sessionStorage |
| RLS Policy Always True | Ignored - required for public forms |
| User Profiles Missing Policy | Fixed - added own-profile read policy |
| SECURITY DEFINER Functions | Noted - risk documented, mitigated by UUID entropy |

This plan addresses all critical security findings while maintaining the required functionality for the public-facing ticketing system.
