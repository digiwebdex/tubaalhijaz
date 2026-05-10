
-- Drop the generated column (cascading to dependent view)
ALTER TABLE public.bookings DROP COLUMN due_amount CASCADE;

-- Re-add as normal numeric column
ALTER TABLE public.bookings ADD COLUMN due_amount numeric DEFAULT 0;

-- Update existing records
UPDATE public.bookings SET due_amount = GREATEST(0, total_amount - paid_amount) WHERE id IS NOT NULL;

-- Recreate the v_booking_profit view
CREATE OR REPLACE VIEW public.v_booking_profit AS
SELECT
  b.id AS booking_id,
  b.tracking_id,
  b.guest_name,
  b.package_id,
  p.name AS package_name,
  p.type AS package_type,
  b.total_amount,
  b.paid_amount,
  b.due_amount,
  b.status,
  COALESCE(pay_total.total_payments, 0) AS total_payments,
  COALESCE(exp_total.total_expenses, 0) AS total_expenses,
  COALESCE(pay_total.total_payments, 0) - COALESCE(exp_total.total_expenses, 0) AS profit
FROM public.bookings b
LEFT JOIN public.packages p ON b.package_id = p.id
LEFT JOIN (
  SELECT booking_id, SUM(amount) AS total_payments
  FROM public.payments WHERE status = 'completed'
  GROUP BY booking_id
) pay_total ON pay_total.booking_id = b.id
LEFT JOIN (
  SELECT booking_id, SUM(amount) AS total_expenses
  FROM public.expenses
  GROUP BY booking_id
) exp_total ON exp_total.booking_id = b.id;
