-- Clean up all test data for crossmint7@gmail.com

-- Step 1: Delete tickets linked to test bookings
DELETE FROM tickets 
WHERE booking_id IN (
  SELECT id FROM bookings WHERE customer_email = 'crossmint7@gmail.com'
);

-- Step 2: Delete VIP email logs
DELETE FROM vip_email_logs 
WHERE contact_email = 'crossmint7@gmail.com';

-- Step 3: Delete VIP invitations (using the contact_id we found)
DELETE FROM vip_invitations 
WHERE contact_id = 'b8364627-2594-4f03-b013-75e602edea31';

-- Step 4: Delete custom invoices linked to test bookings
DELETE FROM custom_invoices 
WHERE booking_id IN (
  SELECT id FROM bookings WHERE customer_email = 'crossmint7@gmail.com'
);

-- Step 5: Delete all bookings
DELETE FROM bookings 
WHERE customer_email = 'crossmint7@gmail.com';

-- Step 6: Delete VIP contact
DELETE FROM vip_contacts 
WHERE email = 'crossmint7@gmail.com';