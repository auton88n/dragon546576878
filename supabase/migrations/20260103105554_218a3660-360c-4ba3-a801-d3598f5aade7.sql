-- Create support_conversations table for live chat
CREATE TABLE public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  transferred_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create new conversations
CREATE POLICY "Anyone can create support conversations"
ON public.support_conversations
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update their own conversation (by providing the id)
CREATE POLICY "Anyone can update own conversation by id"
ON public.support_conversations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Staff can view all conversations
CREATE POLICY "Staff can view all support conversations"
ON public.support_conversations
FOR SELECT
USING (is_staff(auth.uid()));

-- Staff can update conversations
CREATE POLICY "Staff can update support conversations"
ON public.support_conversations
FOR UPDATE
USING (is_staff(auth.uid()));

-- Admins can delete conversations
CREATE POLICY "Admins can delete support conversations"
ON public.support_conversations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_support_conversations_updated_at
BEFORE UPDATE ON public.support_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;