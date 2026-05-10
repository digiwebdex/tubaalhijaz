
CREATE TABLE public.moallems (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text,
  address text,
  nid_number text,
  contract_date date,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.moallems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage moallems" ON public.moallems FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view moallems" ON public.moallems FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role) OR
  has_role(auth.uid(), 'viewer'::app_role)
);
