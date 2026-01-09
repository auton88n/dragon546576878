
-- Delete all test data for crossmint7@gmail.com in correct order

-- Step 1: Delete scan_logs for tickets belonging to these bookings
DELETE FROM scan_logs 
WHERE ticket_id IN (
  SELECT t.id FROM tickets t
  INNER JOIN bookings b ON t.booking_id = b.id
  WHERE LOWER(b.customer_email) = 'crossmint7@gmail.com'
);

-- Step 2: Delete tickets
DELETE FROM tickets 
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE LOWER(customer_email) = 'crossmint7@gmail.com'
);

-- Step 3: Delete email_queue records
DELETE FROM email_queue 
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE LOWER(customer_email) = 'crossmint7@gmail.com'
);

-- Step 4: Delete payment_logs
DELETE FROM payment_logs 
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE LOWER(customer_email) = 'crossmint7@gmail.com'
);

-- Step 5: Delete bookings
DELETE FROM bookings 
WHERE LOWER(customer_email) = 'crossmint7@gmail.com';
