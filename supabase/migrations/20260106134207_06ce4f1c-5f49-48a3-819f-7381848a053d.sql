-- Create employees table for workers who don't need system access
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  department TEXT NOT NULL DEFAULT 'general',
  qr_code_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Staff can view employees
CREATE POLICY "Staff can view employees"
  ON public.employees
  FOR SELECT
  USING (is_staff(auth.uid()));

-- Admin can insert employees
CREATE POLICY "Admin can insert employees"
  ON public.employees
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update employees
CREATE POLICY "Admin can update employees"
  ON public.employees
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can delete employees
CREATE POLICY "Admin can delete employees"
  ON public.employees
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Optional: Employee scan logs for attendance tracking
CREATE TABLE public.employee_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  scanner_user_id UUID,
  scan_location TEXT DEFAULT 'main_entrance'
);

-- Enable RLS on employee_scans
ALTER TABLE public.employee_scans ENABLE ROW LEVEL SECURITY;

-- Staff can view employee scans
CREATE POLICY "Staff can view employee scans"
  ON public.employee_scans
  FOR SELECT
  USING (is_staff(auth.uid()));

-- Staff can insert employee scans
CREATE POLICY "Staff can insert employee scans"
  ON public.employee_scans
  FOR INSERT
  WITH CHECK (is_staff(auth.uid()));

-- Trigger for updated_at on employees
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();