-- Fix overly permissive support_conversations RLS policy
DROP POLICY IF EXISTS "Anyone can update own conversation by id" ON support_conversations;

-- Create a more restrictive policy
-- Customers can only update conversations where status is 'active' (not resolved)
-- Staff can update any conversation
CREATE POLICY "Customers can update active conversations" ON support_conversations
  FOR UPDATE USING (
    status = 'active' OR is_staff(auth.uid())
  )
  WITH CHECK (
    status = 'active' OR is_staff(auth.uid())
  );