-- Remove 'senior' from ticket_type constraint (it's never used)
ALTER TABLE public.tickets DROP CONSTRAINT tickets_ticket_type_check;

ALTER TABLE public.tickets ADD CONSTRAINT tickets_ticket_type_check 
CHECK (ticket_type = ANY (ARRAY['adult'::text, 'child'::text, 'group'::text]));