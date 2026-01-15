-- Add discount and corporate fields to custom_invoices
ALTER TABLE custom_invoices 
ADD COLUMN IF NOT EXISTS original_amount NUMERIC,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_reason TEXT,
ADD COLUMN IF NOT EXISTS group_request_id UUID REFERENCES group_booking_requests(id),
ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT false;

-- Add corporate flag to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS company_name TEXT;