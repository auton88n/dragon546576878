-- Create function to cancel abandoned pending bookings after specified hours
CREATE OR REPLACE FUNCTION public.cancel_abandoned_bookings(hours_old integer DEFAULT 24)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cancelled_count integer;
  cutoff_time timestamptz;
BEGIN
  cutoff_time := NOW() - (hours_old || ' hours')::interval;
  
  -- Cancel abandoned pending bookings (update status, don't delete)
  WITH cancelled AS (
    UPDATE bookings 
    SET 
      booking_status = 'cancelled',
      cancelled_at = NOW(),
      confirmation_email_sent = false
    WHERE payment_status = 'pending'
      AND booking_status != 'cancelled'
      AND created_at < cutoff_time
    RETURNING id
  )
  SELECT COUNT(*) INTO cancelled_count FROM cancelled;
  
  RETURN json_build_object(
    'success', true,
    'cancelled_count', cancelled_count,
    'cutoff_time', cutoff_time,
    'hours_old', hours_old
  );
END;
$function$;