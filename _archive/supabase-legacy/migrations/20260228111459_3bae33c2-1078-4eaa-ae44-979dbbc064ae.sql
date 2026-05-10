
-- Add wallet_account_id to payments and expenses
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS wallet_account_id uuid REFERENCES public.accounts(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS wallet_account_id uuid REFERENCES public.accounts(id);

-- Create or replace trigger to increase wallet balance on payment completed
CREATE OR REPLACE FUNCTION public.on_payment_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking RECORD;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
BEGIN
  -- Only fire when status just changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN

    SELECT id, tracking_id, package_id, user_id INTO v_booking
    FROM public.bookings WHERE id = NEW.booking_id;

    -- 1. Create income transaction
    INSERT INTO public.transactions (
      type, category, amount, booking_id, user_id, date, note, payment_method, customer_id, reference
    ) VALUES (
      'income', 'payment', NEW.amount, NEW.booking_id,
      COALESCE(NEW.user_id, v_booking.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      CURRENT_DATE,
      'Payment #' || COALESCE(NEW.installment_number::text, 'N/A') || ' for ' || COALESCE(v_booking.tracking_id, ''),
      NEW.payment_method, NEW.customer_id, NEW.id::text
    );

    -- 2. Update income account balance
    UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';
    IF NOT FOUND THEN
      INSERT INTO public.accounts (name, type, balance) VALUES ('Revenue', 'income', NEW.amount);
    END IF;

    -- 3. Increase wallet account balance
    IF NEW.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now()
      WHERE id = NEW.wallet_account_id;
    END IF;

    -- 4. Upsert financial_summary
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_total_income, v_total_expense
    FROM public.transactions;

    IF EXISTS (SELECT 1 FROM public.financial_summary LIMIT 1) THEN
      UPDATE public.financial_summary
      SET total_income = v_total_income, total_expense = v_total_expense,
          net_profit = v_total_income - v_total_expense, updated_at = now();
    ELSE
      INSERT INTO public.financial_summary (total_income, total_expense, net_profit)
      VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
    END IF;
  END IF;

  -- Handle reversal
  IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'income';
    UPDATE public.accounts SET balance = balance - OLD.amount, updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';

    -- Reverse wallet balance
    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance - OLD.amount, updated_at = now()
      WHERE id = OLD.wallet_account_id;
    END IF;

    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_total_income, v_total_expense
    FROM public.transactions;

    UPDATE public.financial_summary
    SET total_income = v_total_income, total_expense = v_total_expense,
        net_profit = v_total_income - v_total_expense, updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

-- Create or replace trigger to decrease wallet balance on expense
CREATE OR REPLACE FUNCTION public.on_expense_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  -- Handle wallet balance changes
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now()
    WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old wallet
    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = now()
      WHERE id = OLD.wallet_account_id;
    END IF;
    -- Apply new wallet
    IF NEW.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now()
      WHERE id = NEW.wallet_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = now()
    WHERE id = OLD.wallet_account_id;
  END IF;

  -- Recalculate total expenses
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
$function$;
