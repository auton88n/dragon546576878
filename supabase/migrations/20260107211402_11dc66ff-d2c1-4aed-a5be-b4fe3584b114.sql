-- Create payment_logs table for tracking all payment events
CREATE TABLE public.payment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'attempt', 'success', 'failure', 'manual_update', 'refund'
  payment_id TEXT, -- Moyasar payment ID
  payment_method TEXT, -- 'creditcard', 'mada', 'applepay', 'manual'
  amount NUMERIC,
  status_before TEXT,
  status_after TEXT,
  error_message TEXT,
  changed_by UUID, -- Staff user ID for manual updates
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view all payment logs
CREATE POLICY "Staff can view payment logs"
ON public.payment_logs
FOR SELECT
USING (is_staff(auth.uid()));

-- System can insert logs (service role bypasses RLS)
CREATE POLICY "Anyone can insert payment logs"
ON public.payment_logs
FOR INSERT
WITH CHECK (true);

-- Admins can delete logs
CREATE POLICY "Admins can delete payment logs"
ON public.payment_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster booking lookups
CREATE INDEX idx_payment_logs_booking_id ON public.payment_logs(booking_id);
CREATE INDEX idx_payment_logs_created_at ON public.payment_logs(created_at DESC);