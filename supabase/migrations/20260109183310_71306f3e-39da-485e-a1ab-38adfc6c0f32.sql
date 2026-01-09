-- Delete all test bookings from the database
DELETE FROM bookings 
WHERE customer_email ILIKE '%test%' 
   OR customer_email ILIKE '%example%'
   OR customer_email = 'crossmint7@gmail.com';