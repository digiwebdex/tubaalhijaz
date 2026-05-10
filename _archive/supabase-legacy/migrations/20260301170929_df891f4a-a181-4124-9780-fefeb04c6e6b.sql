
-- Create supplier agent payments table
CREATE TABLE public.supplier_agent_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_agent_id UUID NOT NULL REFERENCES public.supplier_agents(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  wallet_account_id UUID REFERENCES public.accounts(id),
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.supplier_agent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage supplier agent payments"
  ON public.supplier_agent_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view supplier agent payments"
  ON public.supplier_agent_payments FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'accountant'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role) OR
    has_role(auth.uid(), 'viewer'::app_role)
  );
