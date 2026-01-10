-- =============================================
-- TIGHTEN VIP INVITATIONS RLS POLICIES
-- Since we now use secure RPC functions (get_vip_invitation_by_token, update_vip_rsvp),
-- we can remove the overly permissive public policies
-- =============================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view invitation by token" ON vip_invitations;

-- Drop the overly permissive public UPDATE policy  
DROP POLICY IF EXISTS "Public can update invitation RSVP" ON vip_invitations;

-- The "Staff can manage vip_invitations" policy remains for admin access
-- RPC functions handle all public access securely via SECURITY DEFINER

-- =============================================
-- TIGHTEN EMAIL QUEUE RLS POLICIES
-- The current "Service role can manage email queue" is actually correct
-- since it only allows service_role access, but we should make it more explicit
-- =============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Service role can manage email queue" ON email_queue;

-- Recreate with explicit service_role target (more secure)
-- Note: service_role bypasses RLS anyway, but this documents intent
CREATE POLICY "Only service role can manage email queue"
ON email_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- TIGHTEN RATE LIMITS TABLE
-- Only service role should access this table
-- =============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Service role manages rate limits" ON rate_limits;

-- Recreate with explicit service_role target
CREATE POLICY "Only service role can access rate limits"
ON rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- ADDITIONAL SECURITY: Restrict direct table access further
-- =============================================

-- Ensure vip_contacts cannot be read by anonymous users at all
-- (admins/managers already have specific policies)
DROP POLICY IF EXISTS "Public cannot access vip_contacts" ON vip_contacts;
CREATE POLICY "Block anonymous access to vip_contacts"
ON vip_contacts
FOR SELECT
TO anon
USING (false);

-- Ensure custom_invoices direct table access is staff-only
-- Public access is now via get_invoice_by_id RPC
DROP POLICY IF EXISTS "Public can view invoice for payment" ON custom_invoices;