
-- Moallem payments/deposits table
CREATE TABLE public.moallem_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moallem_id uuid NOT NULL REFERENCES public.moallems(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text DEFAULT 'cash',
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  wallet_account_id uuid REFERENCES public.accounts(id),
  recorded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.moallem_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage moallem payments" ON public.moallem_payments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view moallem payments" ON public.moallem_payments
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'accountant'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role) OR
    has_role(auth.uid(), 'viewer'::app_role)
  );

-- Add total_deposit and balance columns to moallems
ALTER TABLE public.moallems ADD COLUMN total_deposit numeric NOT NULL DEFAULT 0;
ALTER TABLE public.moallems ADD COLUMN total_due numeric NOT NULL DEFAULT 0;
