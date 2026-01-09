-- Create custom_invoices table for companies and individuals
CREATE TABLE public.custom_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  client_type TEXT NOT NULL DEFAULT 'individual' CHECK (client_type IN ('company', 'individual')),
  company_name TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  num_adults INTEGER NOT NULL DEFAULT 1,
  num_children INTEGER NOT NULL DEFAULT 0,
  services JSONB DEFAULT '[]'::jsonb,
  visit_date DATE NOT NULL,
  visit_time TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  payment_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view all invoices"
  ON public.custom_invoices FOR SELECT
  USING (is_staff(auth.uid()));

CREATE POLICY "Staff can create invoices"
  ON public.custom_invoices FOR INSERT
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update invoices"
  ON public.custom_invoices FOR UPDATE
  USING (is_staff(auth.uid()));

CREATE POLICY "Admins can delete invoices"
  ON public.custom_invoices FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can view invoice by ID (for payment page)
CREATE POLICY "Public can view invoice for payment"
  ON public.custom_invoices FOR SELECT
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_custom_invoices_updated_at
  BEFORE UPDATE ON public.custom_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_custom_invoices_status ON public.custom_invoices(status);
CREATE INDEX idx_custom_invoices_client_email ON public.custom_invoices(client_email);