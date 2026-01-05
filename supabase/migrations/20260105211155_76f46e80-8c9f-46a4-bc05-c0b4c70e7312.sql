-- Allow anonymous and authenticated users to read ONLY safe booking-related settings
CREATE POLICY "Public can read booking settings"
ON public.settings
FOR SELECT
TO anon, authenticated
USING (
  setting_key IN (
    'operating_hours',
    'event_period',
    'max_tickets_per_booking',
    'advance_booking_days',
    'same_day_cutoff_hour'
  )
);