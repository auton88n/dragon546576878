-- Create function to cleanup abandoned pending bookings older than specified days
CREATE OR REPLACE FUNCTION public.cleanup_abandoned_bookings(days_old integer DEFAULT 3)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
  cutoff_date timestamptz;
BEGIN
  cutoff_date := NOW() - (days_old || ' days')::interval;
  
  -- Delete payment logs for abandoned bookings first (foreign key constraint)
  DELETE FROM payment_logs 
  WHERE booking_id IN (
    SELECT id FROM bookings 
    WHERE payment_status = 'pending'
      AND booking_status != 'cancelled'
      AND created_at < cutoff_date
  );
  
  -- Delete any orphan tickets (shouldn't exist for pending, but safety)
  DELETE FROM tickets 
  WHERE booking_id IN (
    SELECT id FROM bookings 
    WHERE payment_status = 'pending'
      AND booking_status != 'cancelled'
      AND created_at < cutoff_date
  );
  
  -- Delete the abandoned pending bookings
  WITH deleted AS (
    DELETE FROM bookings 
    WHERE payment_status = 'pending'
      AND booking_status != 'cancelled'
      AND created_at < cutoff_date
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN json_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'cutoff_date', cutoff_date,
    'days_old', days_old
  );
END;
$function$;