-- Create a secure function to validate employee badges
-- This bypasses RLS but still requires authentication
CREATE OR REPLACE FUNCTION public.validate_employee_badge(employee_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_data json;
BEGIN
  -- Only allow authenticated users
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  -- Get employee data
  SELECT json_build_object(
    'id', id,
    'full_name', full_name,
    'department', department,
    'is_active', is_active
  ) INTO emp_data
  FROM employees
  WHERE id = employee_id;
  
  -- Return null if employee not found (will be handled in application)
  RETURN emp_data;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_employee_badge(uuid) TO authenticated;