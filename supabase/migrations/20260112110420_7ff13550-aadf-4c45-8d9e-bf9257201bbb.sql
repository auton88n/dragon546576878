-- Add booking_id column to vip_invitations to link VIP invitations to their generated bookings
ALTER TABLE public.vip_invitations 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vip_invitations_booking_id ON public.vip_invitations(booking_id);