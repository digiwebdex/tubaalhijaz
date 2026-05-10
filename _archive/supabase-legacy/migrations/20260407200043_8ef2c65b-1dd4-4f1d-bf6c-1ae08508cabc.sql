
-- ═══════════════════════════════════════════════════════════
-- FIX 1: Payment DELETE must clean up transactions, Revenue, financial_summary
-- Currently trg_on_payment_completed only fires on INSERT/UPDATE (tgtype 21)
-- trg_payment_delete_wallet only reverses wallet but not ledger
-- Solution: Drop separate delete trigger, recreate on_payment_completed to handle DELETE
-- ═══════════════════════════════════════════════════════════

-- Drop the incomplete delete-only wallet trigger
DROP TRIGGER IF EXISTS trg_payment_delete_wallet ON public.payments;

-- Replace on_payment_completed to handle INSERT, UPDATE, and DELETE
CREATE OR REPLACE FUNCTION public.on_payment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_booking RECORD;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  -- === INSERT or UPDATE to 'completed' ===
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.status = 'completed' 
     AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status <> 'completed') THEN

    SELECT id, tracking_id, package_id, user_id INTO v_booking
    FROM public.bookings WHERE id = NEW.booking_id;

    INSERT INTO public.transactions (
      type, category, amount, debit, credit, source_type, source_id,
      booking_id, user_id, date, note, payment_method, customer_id, reference
    ) VALUES (
      'income', 'payment', NEW.amount, NEW.amount, 0, 'customer', NEW.customer_id,
      NEW.booking_id,
      COALESCE(NEW.user_id, v_booking.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      CURRENT_DATE,
      'Payment #' || COALESCE(NEW.installment_number::text, 'N/A') || ' for ' || COALESCE(v_booking.tracking_id, ''),
      NEW.payment_method, NEW.customer_id, NEW.id::text
    );

    UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';
    IF NOT FOUND THEN
      INSERT INTO public.accounts (name, type, balance) VALUES ('Revenue', 'income', NEW.amount);
    END IF;

    IF NEW.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now()
      WHERE id = NEW.wallet_account_id;
    END IF;
  END IF;

  -- === UPDATE from 'completed' to something else ===
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'income';

    UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';

    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
      WHERE id = OLD.wallet_account_id;
    END IF;
  END IF;

  -- === DELETE of a completed payment ===
  IF TG_OP = 'DELETE' AND OLD.status = 'completed' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'income';

    UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';

    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
      WHERE id = OLD.wallet_account_id;
    END IF;
  END IF;

  -- === Recalculate financial_summary for all operations ===
  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_income, v_total_expense FROM public.transactions;

  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM public.expenses;
  v_total_expense := v_total_expense + v_expense_total;

  IF EXISTS (SELECT 1 FROM public.financial_summary LIMIT 1) THEN
    UPDATE public.financial_summary
    SET total_income = v_total_income, total_expense = v_total_expense,
        net_profit = v_total_income - v_total_expense, updated_at = now()
    WHERE id IS NOT NULL;
  ELSE
    INSERT INTO public.financial_summary (total_income, total_expense, net_profit)
    VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate trigger to fire on INSERT, UPDATE, AND DELETE
DROP TRIGGER IF EXISTS trg_on_payment_completed ON public.payments;
CREATE TRIGGER trg_on_payment_completed
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.on_payment_completed();

-- ═══════════════════════════════════════════════════════════
-- FIX 2: Seed wallet accounts if they don't exist
-- auto_assign_wallet trigger needs these to map payment methods
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.accounts (name, type, balance) VALUES ('Cash', 'asset', 0)
ON CONFLICT DO NOTHING;
INSERT INTO public.accounts (name, type, balance) VALUES ('Bank', 'asset', 0)
ON CONFLICT DO NOTHING;
INSERT INTO public.accounts (name, type, balance) VALUES ('bKash', 'asset', 0)
ON CONFLICT DO NOTHING;
INSERT INTO public.accounts (name, type, balance) VALUES ('Nagad', 'asset', 0)
ON CONFLICT DO NOTHING;

-- Check if accounts already exist; if insert fails due to no unique constraint, use conditional insert
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE name = 'Cash' AND type = 'asset') THEN
    INSERT INTO public.accounts (name, type, balance) VALUES ('Cash', 'asset', 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE name = 'Bank' AND type = 'asset') THEN
    INSERT INTO public.accounts (name, type, balance) VALUES ('Bank', 'asset', 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE name = 'bKash' AND type = 'asset') THEN
    INSERT INTO public.accounts (name, type, balance) VALUES ('bKash', 'asset', 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE name = 'Nagad' AND type = 'asset') THEN
    INSERT INTO public.accounts (name, type, balance) VALUES ('Nagad', 'asset', 0);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- FIX 3: Seed financial_summary if empty
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.financial_summary (total_income, total_expense, net_profit)
SELECT 0, 0, 0 WHERE NOT EXISTS (SELECT 1 FROM public.financial_summary);
