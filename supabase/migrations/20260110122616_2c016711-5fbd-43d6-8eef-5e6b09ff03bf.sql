-- Function to get only TRUE pending payments (excluding customers who already completed another booking)
CREATE OR REPLACE FUNCTION public.get_true_pending_payments()
RETURNS TABLE(total_amount numeric, booking_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(p.total_amount), 0)::numeric as total_amount,
    COUNT(*)::bigint as booking_count
  FROM bookings p
  WHERE p.payment_status = 'pending'
    AND p.booking_status != 'cancelled'
    AND NOT EXISTS (
      SELECT 1 FROM bookings c 
      WHERE LOWER(c.customer_email) = LOWER(p.customer_email)
      AND c.payment_status = 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;