-- =============================================
-- SOUQ ALMUFAIJER HERITAGE TICKETING SYSTEM
-- Phase 1: Database Foundation
-- =============================================

-- 1. Create Enum for Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'scanner', 'manager');

-- 2. Create user_roles Table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- 3. Create profiles Table (staff profiles)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    hired_date DATE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create settings Table
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create bookings Table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT UNIQUE NOT NULL,
    
    -- Customer Information
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    
    -- Visit Details
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    
    -- Ticket Counts
    adult_count INTEGER NOT NULL DEFAULT 0 CHECK (adult_count >= 0),
    child_count INTEGER NOT NULL DEFAULT 0 CHECK (child_count >= 0),
    senior_count INTEGER DEFAULT 0 CHECK (senior_count >= 0),
    
    -- Pricing (stored at booking time)
    adult_price DECIMAL(10,2) NOT NULL,
    child_price DECIMAL(10,2) NOT NULL,
    senior_price DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'SAR',
    
    -- Payment
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_id TEXT,
    payment_method TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional Info
    special_requests TEXT,
    language TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
    
    -- Status
    booking_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    
    -- Metadata
    qr_codes_generated BOOLEAN DEFAULT FALSE,
    confirmation_email_sent BOOLEAN DEFAULT FALSE,
    reminder_email_sent BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Validation
    CONSTRAINT at_least_one_ticket CHECK (adult_count + child_count + senior_count > 0)
);

-- 6. Create tickets Table
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    
    -- Ticket Identity
    ticket_code TEXT UNIQUE NOT NULL,
    ticket_type TEXT NOT NULL CHECK (ticket_type IN ('adult', 'child', 'senior')),
    
    -- QR Code
    qr_code_data TEXT NOT NULL,
    qr_code_url TEXT,
    
    -- Usage Status
    is_used BOOLEAN DEFAULT FALSE,
    scanned_at TIMESTAMP WITH TIME ZONE,
    scanned_by UUID REFERENCES auth.users(id),
    scan_location TEXT,
    
    -- Validation
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create scan_logs Table
CREATE TABLE public.scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.tickets(id),
    scanner_user_id UUID REFERENCES auth.users(id),
    
    -- Scan Result
    scan_result TEXT NOT NULL CHECK (scan_result IN ('success', 'already_used', 'invalid', 'expired', 'wrong_date')),
    scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Device Information
    device_info TEXT,
    ip_address INET,
    
    -- Location
    scan_location TEXT DEFAULT 'main_entrance',
    
    -- Additional Data
    notes TEXT
);

-- 8. Create email_queue Table
CREATE TABLE public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Recipient
    to_email TEXT NOT NULL,
    to_name TEXT,
    
    -- Email Content
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Email Type
    email_type TEXT NOT NULL CHECK (email_type IN ('booking_confirmation', 'reminder', 'cancellation')),
    
    -- Attachments
    attachments JSONB,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Related Booking
    booking_id UUID REFERENCES public.bookings(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_bookings_visit_date ON public.bookings(visit_date);
CREATE INDEX idx_bookings_reference ON public.bookings(booking_reference);
CREATE INDEX idx_bookings_customer_email ON public.bookings(customer_email);
CREATE INDEX idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX idx_bookings_booking_status ON public.bookings(booking_status);

CREATE INDEX idx_tickets_code ON public.tickets(ticket_code);
CREATE INDEX idx_tickets_booking_id ON public.tickets(booking_id);
CREATE INDEX idx_tickets_is_used ON public.tickets(is_used);

CREATE INDEX idx_scan_logs_timestamp ON public.scan_logs(scan_timestamp);
CREATE INDEX idx_scan_logs_ticket_id ON public.scan_logs(ticket_id);
CREATE INDEX idx_scan_logs_scanner ON public.scan_logs(scanner_user_id);

CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_email_queue_type ON public.email_queue(email_type);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- =============================================
-- SECURITY DEFINER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to check if user is any staff member
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
    )
$$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- USER_ROLES POLICIES
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- PROFILES POLICIES
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SETTINGS POLICIES
CREATE POLICY "Staff can view settings"
ON public.settings
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- BOOKINGS POLICIES
CREATE POLICY "Anyone can create bookings"
ON public.bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can view own bookings by email"
ON public.bookings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Staff can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Admins can delete bookings"
ON public.bookings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- TICKETS POLICIES
CREATE POLICY "Anyone can view tickets"
ON public.tickets
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "System can create tickets"
ON public.tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Staff can update tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- SCAN_LOGS POLICIES
CREATE POLICY "Staff can view scan logs"
ON public.scan_logs
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can create scan logs"
ON public.scan_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- EMAIL_QUEUE POLICIES
CREATE POLICY "Staff can view email queue"
ON public.email_queue
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "System can manage email queue"
ON public.email_queue
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile for new staff users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INITIAL SETTINGS DATA
-- =============================================

INSERT INTO public.settings (setting_key, setting_value, description, category) VALUES
('ticket_pricing', '{"adult": 100, "child": 50, "senior": 75}', 'Ticket prices in SAR', 'pricing'),
('operating_hours', '{
    "saturday": {"open": "09:00", "close": "18:00", "is_open": true},
    "sunday": {"open": "09:00", "close": "18:00", "is_open": true},
    "monday": {"open": "09:00", "close": "18:00", "is_open": true},
    "tuesday": {"open": "09:00", "close": "18:00", "is_open": true},
    "wednesday": {"open": "09:00", "close": "18:00", "is_open": true},
    "thursday": {"open": "09:00", "close": "18:00", "is_open": true},
    "friday": {"open": "09:00", "close": "18:00", "is_open": false}
}', 'Operating hours per day', 'hours'),
('capacity_limits', '{"daily": 500, "per_slot": 50}', 'Visitor capacity limits', 'capacity'),
('closed_dates', '[]', 'List of closed dates', 'hours'),
('site_info', '{"name_en": "Souq Almufaijer", "name_ar": "سوق المفيجر", "address": "", "phone": "", "email": "info@almufaijer.com"}', 'Site information', 'general');