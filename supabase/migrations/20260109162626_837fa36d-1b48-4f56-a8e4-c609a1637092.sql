-- Add arrival tracking columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS arrival_status text DEFAULT 'not_arrived',
ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
ADD COLUMN IF NOT EXISTS arrived_scanned_by uuid REFERENCES auth.users(id);

-- Create index for arrival status queries
CREATE INDEX IF NOT EXISTS idx_bookings_arrival_status ON public.bookings(arrival_status);

-- Add comments for documentation
COMMENT ON COLUMN public.bookings.arrival_status IS 'Arrival status: not_arrived, arrived';
COMMENT ON COLUMN public.bookings.arrived_at IS 'Timestamp when group was scanned at entrance';
COMMENT ON COLUMN public.bookings.arrived_scanned_by IS 'User ID of scanner who marked arrival';