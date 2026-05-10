
-- Add moallem payment tracking fields to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_by_moallem numeric DEFAULT 0 NOT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS moallem_due numeric DEFAULT 0 NOT NULL;

-- Add booking_id to moallem_payments for per-booking tracking
ALTER TABLE public.moallem_payments ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

-- Backfill moallem_due for existing bookings with moallem
UPDATE public.bookings 
SET moallem_due = GREATEST(0, COALESCE(total_amount, 0) - COALESCE(paid_by_moallem, 0))
WHERE moallem_id IS NOT NULL AND id IS NOT NULL;

-- Update calculate_booking_profit trigger to also set moallem_due
CREATE OR REPLACE FUNCTION public.calculate_booking_profit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  NEW.total_amount := COALESCE(NEW.selling_price_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  NEW.total_cost := COALESCE(NEW.cost_price_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  NEW.profit_amount := NEW.total_amount - COALESCE(NEW.total_cost, 0) - COALESCE(NEW.extra_expense, 0);
  NEW.due_amount := GREATEST(0, NEW.total_amount - COALESCE(NEW.paid_amount, 0));
  NEW.supplier_due := GREATEST(0, COALESCE(NEW.total_cost, 0) - COALESCE(NEW.paid_to_supplier, 0));
  -- Only set moallem_due if booking has a moallem
  IF NEW.moallem_id IS NOT NULL THEN
    NEW.moallem_due := GREATEST(0, NEW.total_amount - COALESCE(NEW.paid_by_moallem, 0));
  ELSE
    NEW.moallem_due := 0;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger to update booking moallem payment tracking
CREATE OR REPLACE FUNCTION public.update_booking_moallem_paid()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_id UUID;
  v_total_paid NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  
  IF v_booking_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Sum all moallem payments for this booking
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.moallem_payments
  WHERE booking_id = v_booking_id;

  -- Get booking total_amount
  SELECT COALESCE(total_amount, 0) INTO v_total_amount
  FROM public.bookings WHERE id = v_booking_id;

  -- Update booking moallem fields
  UPDATE public.bookings
  SET paid_by_moallem = v_total_paid,
      moallem_due = GREATEST(0, v_total_amount - v_total_paid)
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_update_booking_moallem_paid_insert ON public.moallem_payments;
CREATE TRIGGER trg_update_booking_moallem_paid_insert
  AFTER INSERT ON public.moallem_payments
  FOR EACH ROW EXECUTE FUNCTION update_booking_moallem_paid();

DROP TRIGGER IF EXISTS trg_update_booking_moallem_paid_update ON public.moallem_payments;
CREATE TRIGGER trg_update_booking_moallem_paid_update
  AFTER UPDATE ON public.moallem_payments
  FOR EACH ROW EXECUTE FUNCTION update_booking_moallem_paid();

DROP TRIGGER IF EXISTS trg_update_booking_moallem_paid_delete ON public.moallem_payments;
CREATE TRIGGER trg_update_booking_moallem_paid_delete
  AFTER DELETE ON public.moallem_payments
  FOR EACH ROW EXECUTE FUNCTION update_booking_moallem_paid();

-- Update v_booking_profit view to include moallem fields
DROP VIEW IF EXISTS public.v_booking_profit;
CREATE VIEW public.v_booking_profit WITH (security_invoker = on) AS
SELECT
  b.id AS booking_id,
  b.tracking_id,
  b.guest_name,
  b.status,
  b.package_id,
  p.name AS package_name,
  p.type AS package_type,
  b.num_travelers,
  b.selling_price_per_person,
  b.cost_price_per_person,
  b.total_amount,
  b.total_cost,
  b.extra_expense,
  b.profit_amount,
  b.paid_amount,
  b.due_amount,
  b.paid_to_supplier,
  b.supplier_due,
  b.paid_by_moallem,
  b.moallem_due,
  b.moallem_id,
  COALESCE((SELECT SUM(pay.amount) FROM public.payments pay WHERE pay.booking_id = b.id AND pay.status = 'completed'), 0) AS total_payments,
  COALESCE((SELECT SUM(exp.amount) FROM public.expenses exp WHERE exp.booking_id = b.id), 0) AS total_expenses
FROM public.bookings b
LEFT JOIN public.packages p ON b.package_id = p.id;
