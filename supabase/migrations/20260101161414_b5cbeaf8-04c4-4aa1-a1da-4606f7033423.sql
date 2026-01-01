-- =============================================
-- SECURITY FIX: Remove dangerous public access policies
-- =============================================

-- 1. Fix bookings table - remove policy that exposes all customer data
DROP POLICY IF EXISTS "Public can view own bookings by email" ON public.bookings;

-- 2. Fix tickets table - remove policy that exposes all QR codes
DROP POLICY IF EXISTS "Anyone can view tickets" ON public.tickets;

-- 3. Fix email_queue table - remove policy that exposes email content
DROP POLICY IF EXISTS "System can manage email queue" ON public.email_queue;

-- =============================================
-- Create secure access patterns
-- =============================================

-- Create a secure function for booking lookup by ID (for confirmation page)
-- This function uses SECURITY DEFINER to bypass RLS safely
CREATE OR REPLACE FUNCTION public.get_booking_with_tickets(booking_uuid uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', b.id,
    'booking_reference', b.booking_reference,
    'customer_name', b.customer_name,
    'customer_email', b.customer_email,
    'customer_phone', b.customer_phone,
    'visit_date', b.visit_date,
    'visit_time', b.visit_time,
    'adult_count', b.adult_count,
    'child_count', b.child_count,
    'senior_count', b.senior_count,
    'total_amount', b.total_amount,
    'currency', b.currency,
    'booking_status', b.booking_status,
    'payment_status', b.payment_status,
    'confirmation_email_sent', b.confirmation_email_sent,
    'last_email_sent_at', b.last_email_sent_at,
    'language', b.language,
    'tickets', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', t.id,
        'ticket_code', t.ticket_code,
        'ticket_type', t.ticket_type,
        'qr_code_url', t.qr_code_url,
        'is_used', t.is_used,
        'valid_from', t.valid_from,
        'valid_until', t.valid_until
      )), '[]'::json)
      FROM tickets t WHERE t.booking_id = b.id
    )
  ) INTO result
  FROM bookings b
  WHERE b.id = booking_uuid;
  
  RETURN result;
END;
$$;

-- Create a secure function for booking lookup by email (for My Tickets page)
-- Returns limited data and only confirmed/paid bookings
CREATE OR REPLACE FUNCTION public.get_bookings_by_email(customer_email_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Validate email format
  IF customer_email_input !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN '[]'::json;
  END IF;

  SELECT COALESCE(json_agg(booking_data ORDER BY visit_date DESC), '[]'::json) INTO result
  FROM (
    SELECT json_build_object(
      'id', b.id,
      'booking_reference', b.booking_reference,
      'customer_name', b.customer_name,
      'customer_email', b.customer_email,
      'visit_date', b.visit_date,
      'visit_time', b.visit_time,
      'adult_count', b.adult_count,
      'child_count', b.child_count,
      'senior_count', b.senior_count,
      'total_amount', b.total_amount,
      'currency', b.currency,
      'booking_status', b.booking_status,
      'payment_status', b.payment_status,
      'tickets', (
        SELECT COALESCE(json_agg(json_build_object(
          'id', t.id,
          'ticket_code', t.ticket_code,
          'ticket_type', t.ticket_type,
          'qr_code_url', t.qr_code_url,
          'is_used', t.is_used
        )), '[]'::json)
        FROM tickets t WHERE t.booking_id = b.id
      )
    ) as booking_data,
    b.visit_date
    FROM bookings b
    WHERE LOWER(b.customer_email) = LOWER(customer_email_input)
      AND b.booking_status IN ('confirmed', 'completed')
      AND b.payment_status = 'paid'
  ) subquery;
  
  RETURN result;
END;
$$;

-- Grant execute permissions to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_booking_with_tickets(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_bookings_by_email(text) TO anon, authenticated;

-- Add policy for edge function to insert into email_queue (uses service role, but add for safety)
CREATE POLICY "Service role can manage email queue" ON public.email_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add secure policy for tickets - only staff can view
CREATE POLICY "Staff can view all tickets" ON public.tickets
FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));