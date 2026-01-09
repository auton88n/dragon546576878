-- Add language column to custom_invoices table for proper bilingual email support
ALTER TABLE custom_invoices 
ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar';