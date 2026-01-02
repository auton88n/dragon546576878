-- Drop the existing policy that targets 'public' role
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

-- Create new PERMISSIVE policy that allows both anon and authenticated users to insert
CREATE POLICY "Anyone can create bookings" 
ON public.bookings 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);