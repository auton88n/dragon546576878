

# Inbound Email Handler for AYN Support Replies

## Current Situation

The support ticket system works as follows:
1. Admin creates a ticket via the AYN Support Panel
2. Email is sent to `support@mail.aynn.io` with the ticket reference in the subject
3. The ticket is stored in `support_tickets` table with `ayn_notes` column (currently empty)
4. The UI already displays `ayn_notes` when present (the "AYN Response" section)

**What's missing**: When AYN replies to the email, that reply needs to be captured and stored in the `ayn_notes` column so it appears in the admin panel.

---

## Solution Overview

Create an edge function `receive-support-reply` that:
1. Receives inbound emails from Resend when AYN replies
2. Extracts the ticket reference from the email subject
3. Updates the corresponding ticket with the reply content
4. Changes the ticket status to `in_progress` to indicate a response was received

---

## Components to Create/Modify

### 1. New Edge Function

**File:** `supabase/functions/receive-support-reply/index.ts`

This function will:
- Accept webhook POST requests from Resend
- Verify the request using a webhook secret header (`x-webhook-secret`)
- Parse the email payload from Resend
- Extract ticket reference from subject line (e.g., `Re: [Souq Almufaijer] HIGH - Issue title - #8BCE2742`)
- Find the matching ticket in the database
- Update `ayn_notes` with the reply content
- Update `status` to `in_progress` and `updated_at` timestamp

### 2. Config Update

**File:** `supabase/config.toml`

Add:
```toml
[functions.receive-support-reply]
verify_jwt = false
```

### 3. New Secret

A `SUPPORT_WEBHOOK_SECRET` will need to be added for webhook verification.

---

## Technical Flow

```text
AYN Team replies to         Resend Inbound           receive-support-reply       support_tickets
support email                  Webhook                  Edge Function                 table
      |                           |                           |                         |
      |-- Reply email ----------->|                           |                         |
      |                           |-- POST webhook ---------->|                         |
      |                           |                           |-- Extract ticket ID ----|
      |                           |                           |-- Update ayn_notes ---->|
      |                           |                           |-- Set status=in_progress|
      |                           |<-- 200 OK ----------------|                         |
```

---

## Resend Configuration (Manual Steps)

After deployment, you will need to configure Resend:

1. **Go to [resend.com/emails/inbound](https://resend.com/emails/inbound)**
   - Add `support@mail.aynn.io` or create a dedicated reply address

2. **Configure webhook:**
   - URL: `https://hekgkfdunwpxqbrotfpn.supabase.co/functions/v1/receive-support-reply`
   - Header: `x-webhook-secret` = (your SUPPORT_WEBHOOK_SECRET value)
   - Event: `email.received`

---

## Edge Function Implementation Details

The function will:

1. **Validate the webhook secret** from the `x-webhook-secret` header
2. **Parse the Resend payload** which includes:
   - `from`: Sender email (AYN support)
   - `to`: Recipient (support@mail.aynn.io)
   - `subject`: Email subject containing ticket reference
   - `text`: Plain text body of the reply
3. **Extract ticket reference** using regex pattern for `#[A-F0-9]{8}`
4. **Find the ticket** in the database by matching the first 8 characters of the ID
5. **Update the ticket** with:
   - `ayn_notes`: The reply content
   - `status`: `in_progress`
   - `updated_at`: Current timestamp

---

## Translation Updates

Add new translation keys for the enhanced UI:

**English:**
- `admin.support.responseReceived`: "Response received from AYN"
- `admin.support.awaitingResponse`: "Awaiting AYN response"

**Arabic:**
- `admin.support.responseReceived`: "تم استلام رد من AYN"
- `admin.support.awaitingResponse`: "في انتظار رد AYN"

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/receive-support-reply/index.ts` | Create | Inbound email webhook handler |
| `supabase/config.toml` | Modify | Add function config |
| `src/locales/en.json` | Modify | Add new translation keys |
| `src/locales/ar.json` | Modify | Add new translation keys |

---

## Security Considerations

- Webhook secret verification prevents unauthorized access
- The function validates the ticket reference format before database queries
- Only updates existing tickets - cannot create new ones via this endpoint
- Uses service role key internally for database updates

---

## Summary

This implementation creates a complete two-way support communication system:
- **Outbound**: Admins create tickets that send emails to AYN
- **Inbound**: AYN replies are automatically captured and displayed in the admin panel

The existing UI already handles displaying `ayn_notes`, so once the edge function is deployed and Resend is configured, replies will appear automatically in the ticket history.

