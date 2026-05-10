
-- =====================================================
-- STEP 1: Attach all missing triggers to tables
-- =====================================================

-- Drop any existing triggers first (safety)
DROP TRIGGER IF EXISTS trg_update_booking_paid ON public.payments;
DROP TRIGGER IF EXISTS trg_on_payment_completed ON public.payments;
DROP TRIGGER IF EXISTS trg_notify_payment ON public.payments;
DROP TRIGGER IF EXISTS trg_on_expense_changed ON public.expenses;
DROP TRIGGER IF EXISTS trg_notify_booking ON public.bookings;
DROP TRIGGER IF EXISTS trg_check_package_expiry ON public.packages;
DROP TRIGGER IF EXISTS trg_updated_at_bookings ON public.bookings;
DROP TRIGGER IF EXISTS trg_updated_at_hotels ON public.hotels;
DROP TRIGGER IF EXISTS trg_updated_at_packages ON public.packages;
DROP TRIGGER IF EXISTS trg_protect_admin_delete ON public.user_roles;
DROP TRIGGER IF EXISTS trg_protect_admin_update ON public.user_roles;

-- PAYMENT TRIGGERS (order matters: update booking first, then accounting)
CREATE TRIGGER trg_update_booking_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_paid_amount();

CREATE TRIGGER trg_on_payment_completed
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.on_payment_completed();

CREATE TRIGGER trg_notify_payment
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_completed();

-- EXPENSE TRIGGERS
CREATE TRIGGER trg_on_expense_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.on_expense_changed();

-- BOOKING TRIGGERS
CREATE TRIGGER trg_notify_booking
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_completed();

-- PACKAGE TRIGGERS
CREATE TRIGGER trg_check_package_expiry
  BEFORE INSERT OR UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.check_package_expiry();

-- UPDATED_AT TRIGGERS
CREATE TRIGGER trg_updated_at_bookings
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_hotels
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_packages
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ADMIN PROTECTION TRIGGERS
CREATE TRIGGER trg_protect_admin_delete
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_admin_role();

CREATE TRIGGER trg_protect_admin_update
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_admin_role_update();

-- =====================================================
-- STEP 2: Rebuild accounting data from existing records
-- =====================================================

-- 2a. Recalculate all booking paid_amount and due_amount from completed payments
UPDATE public.bookings b SET
  paid_amount = sub.total_paid,
  due_amount = GREATEST(0, b.total_amount - sub.total_paid),
  status = CASE 
    WHEN sub.total_paid >= b.total_amount AND b.total_amount > 0 THEN 'completed'
    ELSE b.status 
  END
FROM (
  SELECT booking_id, COALESCE(SUM(amount), 0) AS total_paid
  FROM public.payments
  WHERE status = 'completed'
  GROUP BY booking_id
) sub
WHERE b.id = sub.booking_id;

-- Also fix bookings with zero payments (ensure due = total)
UPDATE public.bookings SET
  paid_amount = 0,
  due_amount = total_amount
WHERE id NOT IN (SELECT DISTINCT booking_id FROM public.payments WHERE status = 'completed')
  AND (paid_amount != 0 OR due_amount != total_amount)
  AND id IS NOT NULL;

-- 2b. Rebuild income transactions from completed payments
-- Clear stale income transactions
DELETE FROM public.transactions 
WHERE type = 'income' AND category = 'payment' AND id IS NOT NULL;

-- Recreate from completed payments
INSERT INTO public.transactions (type, category, amount, booking_id, user_id, date, note, payment_method, customer_id, reference)
SELECT 
  'income', 'payment', p.amount, p.booking_id,
  COALESCE(p.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(p.paid_at::date, p.created_at::date, CURRENT_DATE),
  'Payment #' || COALESCE(p.installment_number::text, 'N/A') || ' for ' || COALESCE(b.tracking_id, ''),
  p.payment_method, p.customer_id, p.id::text
FROM public.payments p
LEFT JOIN public.bookings b ON b.id = p.booking_id
WHERE p.status = 'completed';

-- 2c. Rebuild Revenue account balance
UPDATE public.accounts SET 
  balance = COALESCE((SELECT SUM(amount) FROM public.payments WHERE status = 'completed'), 0),
  updated_at = now()
WHERE type = 'income' AND name = 'Revenue';

-- Create Revenue account if missing
INSERT INTO public.accounts (name, type, balance)
SELECT 'Revenue', 'income', COALESCE((SELECT SUM(amount) FROM public.payments WHERE status = 'completed'), 0)
WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE type = 'income' AND name = 'Revenue');

-- 2d. Rebuild Operating Expenses account
UPDATE public.accounts SET
  balance = COALESCE((SELECT SUM(amount) FROM public.expenses), 0),
  updated_at = now()
WHERE type = 'expense' AND name = 'Operating Expenses';

INSERT INTO public.accounts (name, type, balance)
SELECT 'Operating Expenses', 'expense', COALESCE((SELECT SUM(amount) FROM public.expenses), 0)
WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE type = 'expense' AND name = 'Operating Expenses');

-- 2e. Rebuild wallet account balances from completed payments
UPDATE public.accounts a SET
  balance = COALESCE(sub.total, 0),
  updated_at = now()
FROM (
  SELECT wallet_account_id, SUM(amount) AS total
  FROM public.payments
  WHERE status = 'completed' AND wallet_account_id IS NOT NULL
  GROUP BY wallet_account_id
) sub
WHERE a.id = sub.wallet_account_id AND a.type = 'asset';

-- Subtract expenses from wallet balances
UPDATE public.accounts a SET
  balance = GREATEST(0, a.balance - COALESCE(sub.total, 0)),
  updated_at = now()
FROM (
  SELECT wallet_account_id, SUM(amount) AS total
  FROM public.expenses
  WHERE wallet_account_id IS NOT NULL
  GROUP BY wallet_account_id
) sub
WHERE a.id = sub.wallet_account_id AND a.type = 'asset';

-- 2f. Rebuild financial_summary
DELETE FROM public.financial_summary WHERE id IS NOT NULL;

INSERT INTO public.financial_summary (total_income, total_expense, net_profit)
SELECT 
  COALESCE((SELECT SUM(amount) FROM public.transactions WHERE type = 'income'), 0),
  COALESCE((SELECT SUM(amount) FROM public.transactions WHERE type = 'expense'), 0) + COALESCE((SELECT SUM(amount) FROM public.expenses), 0),
  COALESCE((SELECT SUM(amount) FROM public.transactions WHERE type = 'income'), 0) - (COALESCE((SELECT SUM(amount) FROM public.transactions WHERE type = 'expense'), 0) + COALESCE((SELECT SUM(amount) FROM public.expenses), 0));
