
-- 1. Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'asset', 'liability')),
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage accounts" ON public.accounts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create financial_summary table
CREATE TABLE public.financial_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_income NUMERIC NOT NULL DEFAULT 0,
  total_expense NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage financial summary" ON public.financial_summary FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add missing columns to existing transactions table
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS customer_id UUID,
  ADD COLUMN IF NOT EXISTS reference TEXT;

-- 4. Add customer_id to expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS customer_id UUID;

-- 5. Add customer_id to payments (maps to profile, not auth user)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS customer_id UUID;
