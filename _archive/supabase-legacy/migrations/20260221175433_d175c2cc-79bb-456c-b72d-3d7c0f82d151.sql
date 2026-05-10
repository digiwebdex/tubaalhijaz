-- Remove duplicate legacy trigger (on_payment_change already covers INSERT/UPDATE/DELETE)
DROP TRIGGER IF EXISTS on_payment_completed ON public.payments;