-- Create group_booking_requests table
CREATE TABLE public.group_booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization Info
  organization_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  
  -- Booking Details
  group_size INTEGER NOT NULL,
  preferred_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  group_type TEXT NOT NULL,
  special_requirements TEXT,
  
  -- Status Management
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  quoted_amount NUMERIC,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_booking_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit group booking requests
CREATE POLICY "Anyone can submit group booking requests" 
  ON public.group_booking_requests 
  FOR INSERT 
  WITH CHECK (true);

-- Staff can view all group requests
CREATE POLICY "Staff can view all group requests" 
  ON public.group_booking_requests 
  FOR SELECT 
  USING (is_staff(auth.uid()));

-- Staff can update group requests
CREATE POLICY "Staff can update group requests" 
  ON public.group_booking_requests 
  FOR UPDATE 
  USING (is_staff(auth.uid()));

-- Admins can delete group requests
CREATE POLICY "Admins can delete group requests" 
  ON public.group_booking_requests 
  FOR DELETE 
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_group_booking_requests_updated_at
  BEFORE UPDATE ON public.group_booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();