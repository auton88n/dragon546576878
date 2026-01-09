-- Cancel all test bookings for crossmint7@gmail.com
UPDATE bookings 
SET booking_status = 'cancelled', 
    cancelled_at = NOW(),
    payment_status = CASE WHEN payment_status = 'pending' THEN 'failed' ELSE payment_status END
WHERE LOWER(customer_email) = 'crossmint7@gmail.com' 
  AND booking_status != 'cancelled';