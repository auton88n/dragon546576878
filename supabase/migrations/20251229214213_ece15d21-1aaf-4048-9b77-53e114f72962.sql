-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets', 'tickets', true);

-- RLS policies for tickets storage bucket
CREATE POLICY "Anyone can view ticket QR codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'tickets');

CREATE POLICY "System can upload QR codes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tickets');

CREATE POLICY "Admins can manage ticket files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'tickets' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'tickets' AND public.has_role(auth.uid(), 'admin'));