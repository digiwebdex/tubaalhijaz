
-- Add missing columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS passport_number text;

-- Add missing columns to packages
ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'::jsonb;

-- Add missing column to payments
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS transaction_id text;

-- Create transactions table (accounting: income/expense)
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  amount numeric NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage transactions"
ON public.transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

-- Create expenses table
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expenses"
ON public.expenses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_transactions_type ON public.transactions (type);
CREATE INDEX idx_transactions_date ON public.transactions (date);
CREATE INDEX idx_expenses_category ON public.expenses (category);
CREATE INDEX idx_expenses_date ON public.expenses (date);
