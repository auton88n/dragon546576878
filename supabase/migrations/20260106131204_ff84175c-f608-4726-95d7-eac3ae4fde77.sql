-- Allow admins to delete support tickets
CREATE POLICY "Admin can delete tickets"
  ON support_tickets
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));