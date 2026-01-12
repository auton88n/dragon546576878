-- Create booking for the paid invoice
INSERT INTO bookings (
  booking_reference,
  customer_name,
  customer_email,
  customer_phone,
  adult_count,
  child_count,
  adult_price,
  child_price,
  total_amount,
  visit_date,
  visit_time,
  payment_status,
  booking_status,
  language,
  paid_at
) VALUES (
  'INV-E291B7',
  'وليد',
  'crossmint7@gmail.com',
  '+966500000000',
  25,
  0,
  40,
  0,
  1000,
  '2026-01-10',
  '14:00',
  'completed',
  'confirmed',
  'ar',
  NOW()
);

-- Link booking to invoice and mark as paid
UPDATE custom_invoices 
SET 
  status = 'paid',
  paid_at = NOW(),
  booking_id = (SELECT id FROM bookings WHERE booking_reference = 'INV-E291B7' ORDER BY created_at DESC LIMIT 1)
WHERE id = '4c17fdbf-41c3-42b8-8c62-5c9eb2936375';