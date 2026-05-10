
-- Add missing profit columns to bookings
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS selling_price_per_person numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_expense numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_amount numeric DEFAULT 0;

-- Create trigger function for auto-calculating profit
CREATE OR REPLACE FUNCTION public.calculate_booking_profit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-calc total selling amount
  NEW.total_amount := COALESCE(NEW.selling_price_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  
  -- Auto-calc total cost
  NEW.total_cost := COALESCE(NEW.cost_price_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  
  -- Auto-calc profit
  NEW.profit_amount := NEW.total_amount - COALESCE(NEW.total_cost, 0) - COALESCE(NEW.extra_expense, 0);
  
  -- Auto-calc due amount
  NEW.due_amount := GREATEST(0, NEW.total_amount - COALESCE(NEW.paid_amount, 0));
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_calculate_booking_profit ON public.bookings;
CREATE TRIGGER trg_calculate_booking_profit
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_booking_profit();

-- Recreate views with profit fields
DROP VIEW IF EXISTS public.v_booking_profit;
CREATE VIEW public.v_booking_profit AS
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
  COALESCE((SELECT SUM(amount) FROM public.payments WHERE booking_id = b.id AND status = 'completed'), 0) AS total_payments,
  COALESCE((SELECT SUM(amount) FROM public.expenses WHERE booking_id = b.id), 0) AS total_expenses
FROM public.bookings b
LEFT JOIN public.packages p ON p.id = b.package_id;

DROP VIEW IF EXISTS public.v_package_profit;
CREATE VIEW public.v_package_profit AS
SELECT
  p.id AS package_id,
  p.name AS package_name,
  p.type AS package_type,
  p.price AS package_price,
  COUNT(b.id) AS total_bookings,
  COALESCE(SUM(b.total_amount), 0) AS total_revenue,
  COALESCE(SUM(b.profit_amount), 0) AS profit,
  COALESCE(SUM(b.total_cost), 0) AS total_expenses
FROM public.packages p
LEFT JOIN public.bookings b ON b.package_id = p.id
GROUP BY p.id, p.name, p.type, p.price;

DROP VIEW IF EXISTS public.v_customer_profit;
CREATE VIEW public.v_customer_profit AS
SELECT
  pr.id AS customer_id,
  pr.full_name,
  pr.phone,
  COUNT(b.id) AS total_bookings,
  COALESCE(SUM(b.total_amount), 0) AS total_payments,
  COALESCE(SUM(b.total_cost), 0) + COALESCE(SUM(b.extra_expense), 0) AS total_expenses,
  COALESCE(SUM(b.profit_amount), 0) AS profit
FROM public.profiles pr
LEFT JOIN public.bookings b ON b.user_id = pr.user_id
GROUP BY pr.id, pr.full_name, pr.phone;

-- Backfill existing bookings
UPDATE public.bookings 
SET selling_price_per_person = CASE WHEN num_travelers > 0 THEN total_amount / num_travelers ELSE total_amount END
WHERE selling_price_per_person IS NULL OR selling_price_per_person = 0;
