-- Add reply tracking columns to contact_submissions table
ALTER TABLE public.contact_submissions
ADD COLUMN IF NOT EXISTS reply_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reply_message text,
ADD COLUMN IF NOT EXISTS reply_sent_at timestamp with time zone;