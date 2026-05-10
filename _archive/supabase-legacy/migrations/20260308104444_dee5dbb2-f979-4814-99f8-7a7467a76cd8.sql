
-- Drop existing RESTRICTIVE policies on daily_cashbook
DROP POLICY IF EXISTS "Admins can manage daily cashbook" ON public.daily_cashbook;
DROP POLICY IF EXISTS "Staff can view daily cashbook" ON public.daily_cashbook;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins can manage daily cashbook"
ON public.daily_cashbook
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view daily cashbook"
ON public.daily_cashbook
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'accountant'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role) OR
  has_role(auth.uid(), 'viewer'::app_role)
);
