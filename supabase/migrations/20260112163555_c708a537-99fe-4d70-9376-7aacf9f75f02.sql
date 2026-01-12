-- Drop existing constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_ticket_type_check;

-- Add new constraint with 'vip' included
ALTER TABLE tickets ADD CONSTRAINT tickets_ticket_type_check 
  CHECK (ticket_type = ANY (ARRAY['adult'::text, 'child'::text, 'group'::text, 'vip'::text]));