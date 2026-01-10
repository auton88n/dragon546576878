-- =============================================
-- PHASE 1: CRITICAL SECURITY FIXES
-- =============================================

-- 1.1 Fix Custom Invoices - Create secure RPC function for public access
CREATE OR REPLACE FUNCTION public.get_invoice_by_id(invoice_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', id,
    'invoice_number', invoice_number,
    'client_name', client_name,
    'client_email', client_email,
    'client_phone', client_phone,
    'client_type', client_type,
    'company_name', company_name,
    'total_amount', total_amount,
    'status', status,
    'visit_date', visit_date,
    'visit_time', visit_time,
    'num_adults', num_adults,
    'num_children', num_children,
    'services', services,
    'notes', notes,
    'language', language,
    'expires_at', expires_at,
    'created_at', created_at
  ) INTO result
  FROM custom_invoices
  WHERE id = invoice_uuid;
  
  RETURN result;
END;
$$;

-- 1.2 Fix VIP Invitations - Create secure RPC functions
CREATE OR REPLACE FUNCTION public.get_vip_invitation_by_token(token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', vi.id,
    'contact_id', vi.contact_id,
    'event_date', vi.event_date,
    'event_time', vi.event_time,
    'guest_allowance', vi.guest_allowance,
    'confirmed_guests', vi.confirmed_guests,
    'confirmed_at', vi.confirmed_at,
    'declined_at', vi.declined_at,
    'decline_reason', vi.decline_reason,
    'perks', vi.perks,
    'offer_details_en', vi.offer_details_en,
    'offer_details_ar', vi.offer_details_ar,
    'include_video', vi.include_video,
    'expires_at', vi.expires_at,
    'contact', json_build_object(
      'name_en', vc.name_en,
      'name_ar', vc.name_ar,
      'email', vc.email,
      'preferred_language', vc.preferred_language
    )
  ) INTO result
  FROM vip_invitations vi
  LEFT JOIN vip_contacts vc ON vc.id = vi.contact_id
  WHERE vi.rsvp_token = token;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_vip_rsvp(
  p_token text,
  p_status text,
  p_guests int DEFAULT NULL,
  p_decline_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_row json;
  v_contact_id uuid;
BEGIN
  -- Get the contact_id for updating vip_contacts
  SELECT contact_id INTO v_contact_id
  FROM vip_invitations
  WHERE rsvp_token = p_token;
  
  IF v_contact_id IS NULL THEN
    RETURN json_build_object('error', 'Invalid token');
  END IF;
  
  -- Update the invitation
  IF p_status = 'confirmed' THEN
    UPDATE vip_invitations
    SET 
      confirmed_guests = COALESCE(p_guests, guest_allowance),
      confirmed_at = NOW(),
      declined_at = NULL,
      decline_reason = NULL
    WHERE rsvp_token = p_token
    RETURNING json_build_object(
      'id', id,
      'confirmed_guests', confirmed_guests,
      'confirmed_at', confirmed_at
    ) INTO updated_row;
    
    -- Update contact status
    UPDATE vip_contacts
    SET 
      status = 'confirmed',
      confirmed_guests = COALESCE(p_guests, 1),
      updated_at = NOW()
    WHERE id = v_contact_id;
  ELSE
    UPDATE vip_invitations
    SET 
      declined_at = NOW(),
      decline_reason = p_decline_reason,
      confirmed_at = NULL,
      confirmed_guests = NULL
    WHERE rsvp_token = p_token
    RETURNING json_build_object(
      'id', id,
      'declined_at', declined_at,
      'decline_reason', decline_reason
    ) INTO updated_row;
    
    -- Update contact status
    UPDATE vip_contacts
    SET 
      status = 'declined',
      updated_at = NOW()
    WHERE id = v_contact_id;
  END IF;
  
  RETURN updated_row;
END;
$$;

-- 1.3 Fix Payment Logs - Remove dangerous public insert policy
DROP POLICY IF EXISTS "Anyone can insert payment logs" ON payment_logs;

-- =============================================
-- PHASE 2: RATE LIMITING TABLE
-- =============================================

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON rate_limits (identifier, action_type, created_at DESC);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage
CREATE POLICY "Service role manages rate limits"
ON rate_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action_type text,
  p_max_attempts int DEFAULT 5,
  p_window_minutes int DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  attempt_count int;
  window_start timestamptz;
BEGIN
  window_start := NOW() - (p_window_minutes || ' minutes')::interval;
  
  -- Count recent attempts
  SELECT COUNT(*)
  INTO attempt_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND created_at > window_start;
  
  IF attempt_count >= p_max_attempts THEN
    RETURN false;
  END IF;
  
  -- Record this attempt
  INSERT INTO rate_limits (identifier, action_type)
  VALUES (p_identifier, p_action_type);
  
  RETURN true;
END;
$$;

-- =============================================
-- PHASE 3: PERFORMANCE INDEXES
-- =============================================

-- Optimize booking lookups
CREATE INDEX IF NOT EXISTS idx_bookings_email 
ON bookings (customer_email);

CREATE INDEX IF NOT EXISTS idx_bookings_visit_date 
ON bookings (visit_date);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status 
ON bookings (payment_status);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_status 
ON bookings (booking_status);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
ON bookings (created_at DESC);

-- Optimize ticket lookups
CREATE INDEX IF NOT EXISTS idx_tickets_booking_id 
ON tickets (booking_id);

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code 
ON tickets (ticket_code);

-- Optimize scan logs
CREATE INDEX IF NOT EXISTS idx_scan_logs_timestamp 
ON scan_logs (scan_timestamp DESC);

-- Optimize invoices
CREATE INDEX IF NOT EXISTS idx_custom_invoices_status 
ON custom_invoices (status);

CREATE INDEX IF NOT EXISTS idx_custom_invoices_created_at 
ON custom_invoices (created_at DESC);

-- Optimize VIP lookups
CREATE INDEX IF NOT EXISTS idx_vip_invitations_token 
ON vip_invitations (rsvp_token);

CREATE INDEX IF NOT EXISTS idx_vip_contacts_status 
ON vip_contacts (status);

-- =============================================
-- PHASE 4: CLEANUP OLD RATE LIMITS (scheduled)
-- =============================================

-- Create cleanup function for rate limits
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;