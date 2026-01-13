-- Fix Ibrahim's booking which has inconsistent status (confirmed but payment_status = failed)
UPDATE bookings 
SET 
  booking_status = 'cancelled', 
  confirmation_email_sent = false,
  cancelled_at = NOW()
WHERE id = 'ddafb082-073d-4319-bf45-9866711096c9'
  AND payment_status = 'failed'
  AND booking_status = 'confirmed';