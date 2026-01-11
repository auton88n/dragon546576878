-- Create marketing_qr_scans table for analytics tracking
CREATE TABLE public.marketing_qr_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  user_agent TEXT,
  referrer TEXT,
  ip_country TEXT
);

-- Indexes for analytics queries
CREATE INDEX idx_marketing_qr_campaign ON marketing_qr_scans(campaign_id);
CREATE INDEX idx_marketing_qr_date ON marketing_qr_scans(scanned_at);

-- Enable RLS
ALTER TABLE public.marketing_qr_scans ENABLE ROW LEVEL SECURITY;

-- Anyone can insert scans (for tracking from edge function)
CREATE POLICY "Anyone can insert scans" ON public.marketing_qr_scans
  FOR INSERT WITH CHECK (true);

-- Staff can view scan analytics
CREATE POLICY "Staff can view scan analytics" ON public.marketing_qr_scans
  FOR SELECT USING (public.is_staff(auth.uid()));

-- Admins can delete old analytics data
CREATE POLICY "Admins can delete scan data" ON public.marketing_qr_scans
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));