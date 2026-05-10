-- Drop the old restrictive check constraint and add one that matches all payment methods used
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check CHECK (payment_method = ANY (ARRAY['cash', 'bkash', 'nagad', 'bank', 'manual', 'online', 'bank_transfer']));
