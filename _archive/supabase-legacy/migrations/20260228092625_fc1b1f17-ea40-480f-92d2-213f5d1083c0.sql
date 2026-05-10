
-- 1. Booking profit view: payments minus expenses per booking
CREATE OR REPLACE VIEW public.v_booking_profit AS
SELECT
  b.id AS booking_id,
  b.tracking_id,
  b.guest_name,
  b.total_amount,
  b.paid_amount,
  b.due_amount,
  b.status,
  b.package_id,
  p_pkg.name AS package_name,
  p_pkg.type AS package_type,
  COALESCE(pay.total_paid, 0) AS total_payments,
  COALESCE(exp.total_expenses, 0) AS total_expenses,
  COALESCE(pay.total_paid, 0) - COALESCE(exp.total_expenses, 0) AS profit
FROM public.bookings b
LEFT JOIN public.packages p_pkg ON p_pkg.id = b.package_id
LEFT JOIN (
  SELECT booking_id, SUM(amount) AS total_paid
  FROM public.payments WHERE status = 'completed'
  GROUP BY booking_id
) pay ON pay.booking_id = b.id
LEFT JOIN (
  SELECT booking_id, SUM(amount) AS total_expenses
  FROM public.expenses WHERE booking_id IS NOT NULL
  GROUP BY booking_id
) exp ON exp.booking_id = b.id;

-- 2. Package profit view: all payments for package minus all expenses for package
CREATE OR REPLACE VIEW public.v_package_profit AS
SELECT
  pkg.id AS package_id,
  pkg.name AS package_name,
  pkg.type AS package_type,
  pkg.price AS package_price,
  COUNT(DISTINCT b.id) AS total_bookings,
  COALESCE(SUM(pay_amt.total_paid), 0) AS total_revenue,
  COALESCE(pkg_exp.direct_expenses, 0) + COALESCE(bk_exp.booking_expenses, 0) AS total_expenses,
  COALESCE(SUM(pay_amt.total_paid), 0) - (COALESCE(pkg_exp.direct_expenses, 0) + COALESCE(bk_exp.booking_expenses, 0)) AS profit
FROM public.packages pkg
LEFT JOIN public.bookings b ON b.package_id = pkg.id
LEFT JOIN (
  SELECT booking_id, SUM(amount) AS total_paid
  FROM public.payments WHERE status = 'completed'
  GROUP BY booking_id
) pay_amt ON pay_amt.booking_id = b.id
LEFT JOIN (
  SELECT package_id, SUM(amount) AS direct_expenses
  FROM public.expenses WHERE package_id IS NOT NULL
  GROUP BY package_id
) pkg_exp ON pkg_exp.package_id = pkg.id
LEFT JOIN (
  SELECT e.booking_id, b2.package_id, SUM(e.amount) AS booking_expenses
  FROM public.expenses e
  JOIN public.bookings b2 ON b2.id = e.booking_id
  WHERE e.booking_id IS NOT NULL AND e.package_id IS NULL
  GROUP BY e.booking_id, b2.package_id
) bk_exp ON bk_exp.package_id = pkg.id
GROUP BY pkg.id, pkg.name, pkg.type, pkg.price, pkg_exp.direct_expenses, bk_exp.booking_expenses;

-- 3. Customer profit view: payments minus expenses per customer
CREATE OR REPLACE VIEW public.v_customer_profit AS
SELECT
  pr.user_id AS customer_id,
  pr.full_name,
  pr.phone,
  COUNT(DISTINCT b.id) AS total_bookings,
  COALESCE(SUM(pay_amt.total_paid), 0) AS total_payments,
  COALESCE(cust_exp.direct_expenses, 0) + COALESCE(SUM(bk_exp.booking_expenses), 0) AS total_expenses,
  COALESCE(SUM(pay_amt.total_paid), 0) - (COALESCE(cust_exp.direct_expenses, 0) + COALESCE(SUM(bk_exp.booking_expenses), 0)) AS profit
FROM public.profiles pr
LEFT JOIN public.bookings b ON b.user_id = pr.user_id
LEFT JOIN (
  SELECT booking_id, SUM(amount) AS total_paid
  FROM public.payments WHERE status = 'completed'
  GROUP BY booking_id
) pay_amt ON pay_amt.booking_id = b.id
LEFT JOIN (
  SELECT customer_id, SUM(amount) AS direct_expenses
  FROM public.expenses WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) cust_exp ON cust_exp.customer_id = pr.user_id
LEFT JOIN (
  SELECT booking_id, SUM(amount) AS booking_expenses
  FROM public.expenses WHERE booking_id IS NOT NULL
  GROUP BY booking_id
) bk_exp ON bk_exp.booking_id = b.id
GROUP BY pr.user_id, pr.full_name, pr.phone, cust_exp.direct_expenses;

-- Grant access to views for authenticated users (RLS on underlying tables still applies)
GRANT SELECT ON public.v_booking_profit TO authenticated;
GRANT SELECT ON public.v_package_profit TO authenticated;
GRANT SELECT ON public.v_customer_profit TO authenticated;
