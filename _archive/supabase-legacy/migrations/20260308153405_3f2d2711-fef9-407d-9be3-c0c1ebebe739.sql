
-- Create moallem_items table (similar to supplier_agent_items)
CREATE TABLE public.moallem_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moallem_id UUID NOT NULL REFERENCES public.moallems(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moallem_items ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Admins can manage moallem items"
  ON public.moallem_items FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view
CREATE POLICY "Staff can view moallem items"
  ON public.moallem_items FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'accountant'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role) OR
    has_role(auth.uid(), 'viewer'::app_role)
  );
