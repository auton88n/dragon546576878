CREATE OR REPLACE FUNCTION public.get_bookings_by_email(customer_email_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      AND b.payment_status = 'completed'
  ) subquery;
  
  RETURN result;
END;
$$;