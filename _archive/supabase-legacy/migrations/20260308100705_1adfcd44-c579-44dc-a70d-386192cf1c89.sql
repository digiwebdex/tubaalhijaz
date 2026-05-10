
-- Daily Cashbook table for tracking daily income and expenses
CREATE TABLE public.daily_cashbook (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'other',
  wallet_account_id UUID REFERENCES public.accounts(id),
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_cashbook ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage daily cashbook"
  ON public.daily_cashbook
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Staff can view
CREATE POLICY "Staff can view daily cashbook"
  ON public.daily_cashbook
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'accountant'::app_role) OR 
    public.has_role(auth.uid(), 'staff'::app_role) OR 
    public.has_role(auth.uid(), 'viewer'::app_role)
  );
