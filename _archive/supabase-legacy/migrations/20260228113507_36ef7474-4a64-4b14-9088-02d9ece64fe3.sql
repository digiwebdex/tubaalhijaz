
-- ========================================================
-- FINANCIAL INTEGRITY ENFORCEMENT
-- Atomic triggers, no negative balances, no negative due
-- ========================================================

-- 1. Add CHECK constraints to prevent negative values
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_balance_non_negative;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0);

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_paid_amount_non_negative;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_paid_amount_non_negative CHECK (paid_amount >= 0);

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_due_amount_non_negative;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_due_amount_non_negative CHECK (due_amount >= 0 OR due_amount IS NULL);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_amount_positive;
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_amount_positive;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);

-- 2. Enforce every payment links to a valid booking (already FK, but ensure NOT NULL)
ALTER TABLE public.payments ALTER COLUMN booking_id SET NOT NULL;

-- 3. Enforce every payment links to a user
ALTER TABLE public.payments ALTER COLUMN user_id SET NOT NULL;

-- 4. Harden update_booking_paid_amount to cap and prevent negatives
CREATE OR REPLACE FUNCTION public.update_booking_paid_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_paid NUMERIC;
  v_total_amount NUMERIC;
  v_due NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.payments
  WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
    AND status = 'completed';

  SELECT total_amount INTO v_total_amount
  FROM public.bookings
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  -- Cap paid_amount: never exceed total, never go negative
  v_total_paid := GREATEST(0, LEAST(v_total_paid, v_total_amount));
  v_due := GREATEST(0, v_total_amount - v_total_paid);

  UPDATE public.bookings
  SET paid_amount = v_total_paid,
      due_amount = v_due,
      status = CASE WHEN v_total_paid >= v_total_amount THEN 'completed' ELSE status END
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Harden on_payment_completed: atomic wallet + financial_summary updates
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
  -- Only fire when status just changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN

    SELECT id, tracking_id, package_id, user_id INTO v_booking
    FROM public.bookings WHERE id = NEW.booking_id;

    -- 1. Create income transaction atomically
    INSERT INTO public.transactions (
      type, category, amount, booking_id, user_id, date, note, payment_method, customer_id, reference
    ) VALUES (
      'income', 'payment', NEW.amount, NEW.booking_id,
      COALESCE(NEW.user_id, v_booking.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      CURRENT_DATE,
      'Payment #' || COALESCE(NEW.installment_number::text, 'N/A') || ' for ' || COALESCE(v_booking.tracking_id, ''),
      NEW.payment_method, NEW.customer_id, NEW.id::text
    );

    -- 2. Update revenue account
    UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';
    IF NOT FOUND THEN
      INSERT INTO public.accounts (name, type, balance) VALUES ('Revenue', 'income', NEW.amount);
    END IF;

    -- 3. Increase wallet balance (guard against going negative on reversal)
    IF NEW.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now()
      WHERE id = NEW.wallet_account_id;
    END IF;

    -- 4. Recalculate financial_summary atomically
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_total_income, v_total_expense
    FROM public.transactions;

    -- Add expense table totals
    SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM public.expenses;
    v_total_expense := v_total_expense + v_expense_total;

    IF EXISTS (SELECT 1 FROM public.financial_summary LIMIT 1) THEN
      UPDATE public.financial_summary
      SET total_income = v_total_income, total_expense = v_total_expense,
          net_profit = v_total_income - v_total_expense, updated_at = now();
    ELSE
      INSERT INTO public.financial_summary (total_income, total_expense, net_profit)
      VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
    END IF;
  END IF;

  -- Handle reversal: status changed FROM completed to something else
  IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'income';

    UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';

    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
      WHERE id = OLD.wallet_account_id;
    END IF;

    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_total_income, v_total_expense
    FROM public.transactions;

    SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM public.expenses;
    v_total_expense := v_total_expense + v_expense_total;

    UPDATE public.financial_summary
    SET total_income = v_total_income, total_expense = v_total_expense,
        net_profit = v_total_income - v_total_expense, updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Harden on_expense_changed: prevent negative wallet balances
CREATE OR REPLACE FUNCTION public.on_expense_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
  v_wallet_balance NUMERIC;
BEGIN
  -- Handle wallet balance changes with negative guard
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    SELECT balance INTO v_wallet_balance FROM public.accounts WHERE id = NEW.wallet_account_id;
    IF v_wallet_balance < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Required: %', v_wallet_balance, NEW.amount;
    END IF;
    UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now()
    WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = now()
      WHERE id = OLD.wallet_account_id;
    END IF;
    IF NEW.wallet_account_id IS NOT NULL THEN
      SELECT balance INTO v_wallet_balance FROM public.accounts WHERE id = NEW.wallet_account_id;
      IF v_wallet_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Required: %', v_wallet_balance, NEW.amount;
      END IF;
      UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now()
      WHERE id = NEW.wallet_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = now()
    WHERE id = OLD.wallet_account_id;
  END IF;

  -- Recalculate totals atomically
  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM public.expenses;

  UPDATE public.accounts SET balance = v_expense_total, updated_at = now()
  WHERE type = 'expense' AND name = 'Operating Expenses';
  IF NOT FOUND THEN
    INSERT INTO public.accounts (name, type, balance) VALUES ('Operating Expenses', 'expense', v_expense_total);
  END IF;

  SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expense
  FROM public.transactions;

  v_total_expense := v_total_expense + v_expense_total;

  IF EXISTS (SELECT 1 FROM public.financial_summary LIMIT 1) THEN
    UPDATE public.financial_summary
    SET total_expense = v_total_expense, total_income = v_total_income,
        net_profit = v_total_income - v_total_expense, updated_at = now();
  ELSE
    INSERT INTO public.financial_summary (total_income, total_expense, net_profit)
    VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
