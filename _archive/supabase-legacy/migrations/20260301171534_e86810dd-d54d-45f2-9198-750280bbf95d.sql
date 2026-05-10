
-- Drop and recreate v_booking_profit with total_cost column
DROP VIEW IF EXISTS public.v_booking_profit;

CREATE VIEW public.v_booking_profit WITH (security_invoker = on) AS
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
  COALESCE(b.total_cost, 0) AS total_cost,
  COALESCE(pay_total.total_payments, 0::numeric) AS total_payments,
  COALESCE(exp_total.total_expenses, 0::numeric) AS total_expenses,
  (COALESCE(pay_total.total_payments, 0::numeric) - COALESCE(b.total_cost, 0) - COALESCE(exp_total.total_expenses, 0::numeric)) AS profit
FROM bookings b
LEFT JOIN packages p ON b.package_id = p.id
LEFT JOIN (
  SELECT booking_id, sum(amount) AS total_payments
  FROM payments WHERE status = 'completed' GROUP BY booking_id
) pay_total ON pay_total.booking_id = b.id
LEFT JOIN (
  SELECT booking_id, sum(amount) AS total_expenses
  FROM expenses GROUP BY booking_id
) exp_total ON exp_total.booking_id = b.id;

-- Recreate v_package_profit with supplier costs
DROP VIEW IF EXISTS public.v_package_profit;

CREATE VIEW public.v_package_profit WITH (security_invoker = on) AS
SELECT
  p.id AS package_id,
  p.name AS package_name,
  p.price AS package_price,
  p.type AS package_type,
  COUNT(b.id) AS total_bookings,
  COALESCE(SUM(pay.total_payments), 0) AS total_revenue,
  COALESCE(SUM(b.total_cost), 0) + COALESCE(SUM(exp.total_expenses), 0) AS total_expenses,
  COALESCE(SUM(pay.total_payments), 0) - COALESCE(SUM(b.total_cost), 0) - COALESCE(SUM(exp.total_expenses), 0) AS profit
FROM packages p
LEFT JOIN bookings b ON b.package_id = p.id
LEFT JOIN (
  SELECT booking_id, sum(amount) AS total_payments
  FROM payments WHERE status = 'completed' GROUP BY booking_id
) pay ON pay.booking_id = b.id
LEFT JOIN (
  SELECT booking_id, sum(amount) AS total_expenses
  FROM expenses GROUP BY booking_id
) exp ON exp.booking_id = b.id
GROUP BY p.id, p.name, p.price, p.type;

-- Recreate v_customer_profit with supplier costs
DROP VIEW IF EXISTS public.v_customer_profit;

CREATE VIEW public.v_customer_profit WITH (security_invoker = on) AS
SELECT
  pr.user_id AS customer_id,
  pr.full_name,
  pr.phone,
  COUNT(b.id) AS total_bookings,
  COALESCE(SUM(pay.total_payments), 0) AS total_payments,
  COALESCE(SUM(b.total_cost), 0) + COALESCE(SUM(exp.total_expenses), 0) AS total_expenses,
  COALESCE(SUM(pay.total_payments), 0) - COALESCE(SUM(b.total_cost), 0) - COALESCE(SUM(exp.total_expenses), 0) AS profit
FROM profiles pr
LEFT JOIN bookings b ON b.user_id = pr.user_id
LEFT JOIN (
  SELECT booking_id, sum(amount) AS total_payments
  FROM payments WHERE status = 'completed' GROUP BY booking_id
) pay ON pay.booking_id = b.id
LEFT JOIN (
  SELECT booking_id, sum(amount) AS total_expenses
  FROM expenses GROUP BY booking_id
) exp ON exp.booking_id = b.id
GROUP BY pr.user_id, pr.full_name, pr.phone;
