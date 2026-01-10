-- Delete payment logs for pending Jan 7 bookings
DELETE FROM payment_logs 
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE visit_date = '2026-01-07' AND payment_status = 'pending'
);

-- Delete any tickets for pending Jan 7 bookings (should be none)
DELETE FROM tickets 
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE visit_date = '2026-01-07' AND payment_status = 'pending'
);

-- Delete the 62 pending bookings for free day Jan 7
DELETE FROM bookings 
WHERE visit_date = '2026-01-07' AND payment_status = 'pending';