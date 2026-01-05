-- Add explicit RLS policies to deny anonymous (public) access to sensitive tables
-- This ensures even if someone tries to query these tables directly via anon key, they get no results

-- Deny anonymous SELECT on bookings (contains PII and payment info)
CREATE POLICY "Deny anonymous access to bookings" 
ON public.bookings 
FOR SELECT 
TO anon 
USING (false);

-- Deny anonymous SELECT on profiles (contains staff PII)
CREATE POLICY "Deny anonymous access to profiles" 
ON public.profiles 
FOR SELECT 
TO anon 
USING (false);

-- Deny anonymous SELECT on scan_logs (contains scanning activity)
CREATE POLICY "Deny anonymous access to scan_logs" 
ON public.scan_logs 
FOR SELECT 
TO anon 
USING (false);

-- Deny anonymous SELECT on tickets (contains ticket codes and QR data)
CREATE POLICY "Deny anonymous access to tickets" 
ON public.tickets 
FOR SELECT 
TO anon 
USING (false);

-- Deny anonymous SELECT on email_queue (contains email content)
CREATE POLICY "Deny anonymous access to email_queue" 
ON public.email_queue 
FOR SELECT 
TO anon 
USING (false);