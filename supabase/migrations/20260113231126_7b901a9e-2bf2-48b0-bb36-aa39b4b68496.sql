-- Fix all inconsistent bookings: confirmed + pending/failed payment 
-- These are abandoned bookings that never completed payment - mark as cancelled
UPDATE bookings 
SET 
  booking_status = 'cancelled',
  confirmation_email_sent = false,
  cancelled_at = COALESCE(cancelled_at, NOW())
WHERE booking_status = 'confirmed' 
  AND payment_status IN ('pending', 'failed')
  AND created_at < NOW() - INTERVAL '30 minutes';