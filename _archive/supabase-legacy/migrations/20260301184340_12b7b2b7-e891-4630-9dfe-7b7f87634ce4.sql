
-- First add commission columns (IF NOT EXISTS handles idempotency)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS commission_per_person numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS total_commission numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS commission_paid numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS commission_due numeric DEFAULT 0 NOT NULL;

-- Now drop and recreate the view
DROP VIEW IF EXISTS public.v_booking_profit;

CREATE VIEW public.v_booking_profit AS
SELECT
  b.id AS booking_id,
  b.tracking_id,
  b.guest_name,
  b.status,
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
  b.commission_per_person,
  b.total_commission,
  b.commission_paid,
  b.commission_due,
  p.name AS package_name,
  p.type AS package_type,
  b.package_id,
  COALESCE((SELECT SUM(pay.amount) FROM public.payments pay WHERE pay.booking_id = b.id AND pay.status = 'completed'), 0) AS total_payments,
  COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.booking_id = b.id), 0) AS total_expenses
FROM public.bookings b
LEFT JOIN public.packages p ON b.package_id = p.id;
