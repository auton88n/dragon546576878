-- Add tracking columns to vip_email_logs
ALTER TABLE public.vip_email_logs
ADD COLUMN tracking_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN open_count INTEGER DEFAULT 0;

-- Create index for fast tracking lookups
CREATE INDEX idx_vip_email_logs_tracking_id ON public.vip_email_logs(tracking_id);