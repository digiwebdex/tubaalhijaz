
-- Remove duplicate triggers (keep only the new ones)
DROP TRIGGER IF EXISTS on_payment_change ON public.payments;
DROP TRIGGER IF EXISTS trg_on_payment_completed ON public.payments;
