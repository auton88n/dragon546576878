-- Create VIP contacts table for storing celebrity/VIP information
CREATE TABLE public.vip_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    title_en TEXT,
    title_ar TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    category TEXT NOT NULL DEFAULT 'celebrity' CHECK (category IN ('influencer', 'celebrity', 'media', 'government', 'business')),
    preferred_language TEXT NOT NULL DEFAULT 'ar' CHECK (preferred_language IN ('ar', 'en')),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'confirmed', 'declined', 'attended')),
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create VIP email logs table for tracking sent emails
CREATE TABLE public.vip_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES public.vip_contacts(id) ON DELETE SET NULL,
    contact_email TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    template_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vip_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for vip_contacts (admin only)
CREATE POLICY "Admins can manage VIP contacts"
ON public.vip_contacts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view VIP contacts"
ON public.vip_contacts
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- RLS policies for vip_email_logs (admin only)
CREATE POLICY "Admins can manage VIP email logs"
ON public.vip_email_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view VIP email logs"
ON public.vip_email_logs
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_vip_contacts_updated_at
BEFORE UPDATE ON public.vip_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();