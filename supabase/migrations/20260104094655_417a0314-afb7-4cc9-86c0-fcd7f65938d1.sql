-- Create support_tickets table for AYN support requests
CREATE TABLE public.support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  admin_email text NOT NULL,
  admin_name text NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  ayn_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Staff can view all support tickets
CREATE POLICY "Staff can view all support tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()));

-- Admin/Manager can create tickets
CREATE POLICY "Admin and Manager can create tickets"
  ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'manager')
  );

-- Admin can update tickets (for status changes when AYN responds)
CREATE POLICY "Admin can update tickets"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();