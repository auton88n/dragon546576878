-- Fix existing bookings with incorrect visit time (09:00 -> 15:00)
UPDATE bookings 
SET visit_time = '15:00:00' 
WHERE visit_time = '09:00:00';