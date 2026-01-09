-- Add confirmed guests tracking to vip_contacts
ALTER TABLE vip_contacts ADD COLUMN IF NOT EXISTS confirmed_guests INTEGER DEFAULT 0;

-- Create VIP invitations table for full tracking
CREATE TABLE vip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES vip_contacts(id) ON DELETE CASCADE,
  rsvp_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  guest_allowance INTEGER DEFAULT 2,
  perks JSONB DEFAULT '[]',
  include_video BOOLEAN DEFAULT true,
  event_date DATE,
  event_time TEXT,
  offer_details_en TEXT,
  offer_details_ar TEXT,
  confirmed_at TIMESTAMPTZ,
  confirmed_guests INTEGER,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE vip_invitations ENABLE ROW LEVEL SECURITY;

-- Staff can manage invitations
CREATE POLICY "Staff can manage vip_invitations" ON vip_invitations
  FOR ALL USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Public can view invitation by token (for RSVP page - no auth required)
CREATE POLICY "Public can view invitation by token" ON vip_invitations
  FOR SELECT USING (true);

-- Public can update their RSVP (confirm/decline)
CREATE POLICY "Public can update invitation RSVP" ON vip_invitations
  FOR UPDATE USING (true)
  WITH CHECK (true);