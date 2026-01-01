-- Add last_email_sent_at column for email rate limiting
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;