-- Fix Critical RLS Vulnerability: Remove dangerous UPDATE policy that allows unauthenticated access
-- This policy allowed anyone to update active conversations without authentication

DROP POLICY IF EXISTS "Customers can update active conversations" ON support_conversations;