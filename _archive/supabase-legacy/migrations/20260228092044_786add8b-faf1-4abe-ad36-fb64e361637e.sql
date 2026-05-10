
-- Add package_id and expense_type to expenses for assignment flexibility
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.packages(id),
  ADD COLUMN IF NOT EXISTS expense_type TEXT NOT NULL DEFAULT 'other';

-- Update category check: allow new granular types
COMMENT ON COLUMN public.expenses.expense_type IS 'visa, ticket, hotel, transport, food, guide, office, other';
COMMENT ON COLUMN public.expenses.category IS 'Assigned to: booking, customer, package, general';
