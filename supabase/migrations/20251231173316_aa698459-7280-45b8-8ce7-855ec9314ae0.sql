-- Create packages table
CREATE TABLE public.packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en text NOT NULL,
    name_ar text NOT NULL,
    description_en text,
    description_ar text,
    adult_count integer NOT NULL DEFAULT 1,
    child_count integer NOT NULL DEFAULT 0,
    price numeric NOT NULL,
    image_url text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create attractions table
CREATE TABLE public.attractions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en text NOT NULL,
    name_ar text NOT NULL,
    description_en text,
    description_ar text,
    icon text DEFAULT 'Landmark',
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attractions ENABLE ROW LEVEL SECURITY;

-- RLS policies for packages
CREATE POLICY "Anyone can view active packages" ON public.packages
FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can view all packages" ON public.packages
FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY "Admins can manage packages" ON public.packages
FOR ALL USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for attractions
CREATE POLICY "Anyone can view active attractions" ON public.attractions
FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can view all attractions" ON public.attractions
FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY "Admins can manage attractions" ON public.attractions
FOR ALL USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default packages
INSERT INTO public.packages (name_en, name_ar, description_en, description_ar, adult_count, child_count, price, display_order) VALUES
('Adult', 'بالغ', 'Single adult ticket', 'تذكرة بالغ واحد', 1, 0, 40, 1),
('Child', 'طفل', 'Single child ticket (under 12)', 'تذكرة طفل واحد (أقل من 12 سنة)', 0, 1, 25, 2),
('Small Family', 'عائلة صغيرة', '2 Adults + 3 Children', '2 بالغين + 3 أطفال', 2, 3, 149.99, 3),
('Large Family', 'عائلة كبيرة', '2 Adults + 6 Children', '2 بالغين + 6 أطفال', 2, 6, 199.99, 4);

-- Insert default attractions
INSERT INTO public.attractions (name_en, name_ar, description_en, description_ar, icon, display_order) VALUES
('Traditional Market', 'السوق الشعبية', 'Heritage marketplace: traditional foods, incense, honey, handicrafts', 'سوق منتجات تراثية متنوعة: مأكولات، بخور، عسل، حرف يدوية', 'ShoppingBag', 1),
('Samha', 'سمحة', 'Authentic heritage site reflecting traditional village life', 'موقع تراثي أصيل يعكس الحياة التقليدية في القرية', 'Home', 2),
('Al-Adab Area', 'منطقة العداب', 'Stunning natural area to enjoy beautiful surroundings', 'منطقة طبيعية خلابة للاستمتاع بجمال المحيط', 'Mountain', 3),
('Al-Wajah', 'الوجاة', 'Distinguished heritage landmark telling ancestors'' stories', 'معلم تراثي مميز يروي قصص الأجداد', 'Landmark', 4),
('Al-Oud', 'العود', 'Historical site celebrating local heritage', 'موقع تاريخي يحتفي بالتراث المحلي', 'Building2', 5),
('Al-Busiteen', 'البسيتين', 'Traditional orchard showcasing heritage agriculture', 'بستان تقليدي يعرض الزراعة التراثية', 'TreePalm', 6),
('Alya', 'عليا', 'Cultural experiences and heritage activities', 'تجارب ثقافية وأنشطة تراثية', 'Palette', 7),
('Al-Sawani', 'السواني', 'Heritage activities and local traditions', 'أنشطة تراثية وتقاليد محلية', 'Users', 8);

-- Add triggers for updated_at
CREATE TRIGGER update_packages_updated_at
BEFORE UPDATE ON public.packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attractions_updated_at
BEFORE UPDATE ON public.attractions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();