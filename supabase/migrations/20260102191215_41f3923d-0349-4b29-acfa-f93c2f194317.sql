-- Drop the existing restrictive policy and create a permissive one
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

-- Create a new PERMISSIVE policy that allows anyone to insert bookings
CREATE POLICY "Anyone can create bookings" 
ON public.bookings 
FOR INSERT 
TO public
WITH CHECK (true);