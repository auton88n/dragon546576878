-- Drop the old constraint and add a new one that includes 'group' type
ALTER TABLE public.tickets DROP CONSTRAINT tickets_ticket_type_check;

ALTER TABLE public.tickets ADD CONSTRAINT tickets_ticket_type_check 
CHECK (ticket_type = ANY (ARRAY['adult'::text, 'child'::text, 'senior'::text, 'group'::text]));