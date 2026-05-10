
-- Add debit, credit, source_type, source_id columns to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS debit numeric NOT NULL DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS credit numeric NOT NULL DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'other';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source_id uuid;

-- Backfill existing transactions
UPDATE public.transactions SET 
  debit = CASE WHEN type = 'income' THEN amount ELSE 0 END,
  credit = CASE WHEN type = 'expense' THEN amount ELSE 0 END,
  source_type = CASE 
    WHEN category = 'payment' THEN 'customer'
    WHEN category = 'moallem_payment' THEN 'moallem'
    WHEN category = 'supplier_payment' THEN 'supplier'
    WHEN category = 'commission_payment' THEN 'commission'
    ELSE 'other'
  END
WHERE id IS NOT NULL;

-- Update on_payment_completed to use debit/credit and source_type
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
  v_expense_total NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status <> 'completed') THEN
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

    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO v_total_income, v_total_expense
    FROM public.transactions;

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
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'income';

    UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';

    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
      WHERE id = OLD.wallet_account_id;
    END IF;

    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO v_total_income, v_total_expense
    FROM public.transactions;

    SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM public.expenses;
    v_total_expense := v_total_expense + v_expense_total;

    UPDATE public.financial_summary
    SET total_income = v_total_income, total_expense = v_total_expense,
        net_profit = v_total_income - v_total_expense, updated_at = now()
    WHERE id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update on_moallem_payment_income to use debit/credit and source_type
CREATE OR REPLACE FUNCTION public.on_moallem_payment_income()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_moallem_name TEXT;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  SELECT name INTO v_moallem_name FROM public.moallems
  WHERE id = COALESCE(NEW.moallem_id, OLD.moallem_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference, booking_id)
    VALUES ('income', 'moallem_payment', NEW.amount, NEW.amount, 0, 'moallem', NEW.moallem_id,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Moallem payment from ' || COALESCE(v_moallem_name, 'Unknown'),
      NEW.payment_method, NEW.id::text, NEW.booking_id);

    UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';
    IF NOT FOUND THEN
      INSERT INTO public.accounts (name, type, balance) VALUES ('Revenue', 'income', NEW.amount);
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'income' AND category = 'moallem_payment';
    UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';

    INSERT INTO public.transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference, booking_id)
    VALUES ('income', 'moallem_payment', NEW.amount, NEW.amount, 0, 'moallem', NEW.moallem_id,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Moallem payment from ' || COALESCE(v_moallem_name, 'Unknown'),
      NEW.payment_method, NEW.id::text, NEW.booking_id);
    UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';

  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'income' AND category = 'moallem_payment';
    UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';
  END IF;

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
$function$;

-- Update on_supplier_payment_changed to use debit/credit and source_type
CREATE OR REPLACE FUNCTION public.on_supplier_payment_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agent_name TEXT;
  v_wallet_balance NUMERIC;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    SELECT balance INTO v_wallet_balance FROM public.accounts WHERE id = NEW.wallet_account_id;
    IF v_wallet_balance < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Required: %', v_wallet_balance, NEW.amount;
    END IF;
    UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
    END IF;
    IF NEW.wallet_account_id IS NOT NULL THEN
      SELECT balance INTO v_wallet_balance FROM public.accounts WHERE id = NEW.wallet_account_id;
      IF v_wallet_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Required: %', v_wallet_balance, NEW.amount;
      END IF;
      UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;

  SELECT agent_name INTO v_agent_name FROM public.supplier_agents
  WHERE id = COALESCE(NEW.supplier_agent_id, OLD.supplier_agent_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'supplier_payment', NEW.amount, 0, NEW.amount, 'supplier', NEW.supplier_agent_id,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Supplier payment to ' || COALESCE(v_agent_name, 'Unknown'),
      NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'supplier_payment';
    INSERT INTO public.transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'supplier_payment', NEW.amount, 0, NEW.amount, 'supplier', NEW.supplier_agent_id,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Supplier payment to ' || COALESCE(v_agent_name, 'Unknown'),
      NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'supplier_payment';
  END IF;

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
$function$;

-- Update on_commission_payment_changed to use debit/credit and source_type
CREATE OR REPLACE FUNCTION public.on_commission_payment_changed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_moallem_name TEXT;
  v_wallet_balance NUMERIC;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    SELECT balance INTO v_wallet_balance FROM public.accounts WHERE id = NEW.wallet_account_id;
    IF v_wallet_balance < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Required: %', v_wallet_balance, NEW.amount;
    END IF;
    UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
    END IF;
    IF NEW.wallet_account_id IS NOT NULL THEN
      SELECT balance INTO v_wallet_balance FROM public.accounts WHERE id = NEW.wallet_account_id;
      IF v_wallet_balance < NEW.amount THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Required: %', v_wallet_balance, NEW.amount;
      END IF;
      UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;

  SELECT name INTO v_moallem_name FROM public.moallems
  WHERE id = COALESCE(NEW.moallem_id, OLD.moallem_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'commission_payment', NEW.amount, 0, NEW.amount, 'commission', NEW.moallem_id,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Commission payment to ' || COALESCE(v_moallem_name, 'Unknown'),
      NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'commission_payment';
    INSERT INTO public.transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'commission_payment', NEW.amount, 0, NEW.amount, 'commission', NEW.moallem_id,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Commission payment to ' || COALESCE(v_moallem_name, 'Unknown'),
      NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'commission_payment';
  END IF;

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
$function$;

-- Update on_expense_changed to use debit/credit
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
  v_wallet_balance NUMERIC;
BEGIN
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

  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM public.expenses;

  UPDATE public.accounts SET balance = v_expense_total, updated_at = now()
  WHERE type = 'expense' AND name = 'Operating Expenses';
  IF NOT FOUND THEN
    INSERT INTO public.accounts (name, type, balance) VALUES ('Operating Expenses', 'expense', v_expense_total);
  END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO v_total_income, v_total_expense
  FROM public.transactions;

  v_total_expense := v_total_expense + v_expense_total;

  IF EXISTS (SELECT 1 FROM public.financial_summary LIMIT 1) THEN
    UPDATE public.financial_summary
    SET total_expense = v_total_expense, total_income = v_total_income,
        net_profit = v_total_income - v_total_expense, updated_at = now()
    WHERE id IS NOT NULL;
  ELSE
    INSERT INTO public.financial_summary (total_income, total_expense, net_profit)
    VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recreate all triggers
DROP TRIGGER IF EXISTS trg_on_payment_completed ON public.payments;
CREATE TRIGGER trg_on_payment_completed AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.on_payment_completed();

DROP TRIGGER IF EXISTS trg_update_booking_paid_amount ON public.payments;
CREATE TRIGGER trg_update_booking_paid_amount AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_booking_paid_amount();

DROP TRIGGER IF EXISTS trg_notify_payment_completed ON public.payments;
CREATE TRIGGER trg_notify_payment_completed AFTER INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.notify_payment_completed();

DROP TRIGGER IF EXISTS trg_on_moallem_payment_income ON public.moallem_payments;
CREATE TRIGGER trg_on_moallem_payment_income AFTER INSERT OR UPDATE OR DELETE ON public.moallem_payments FOR EACH ROW EXECUTE FUNCTION public.on_moallem_payment_income();

DROP TRIGGER IF EXISTS trg_on_moallem_payment_wallet ON public.moallem_payments;
CREATE TRIGGER trg_on_moallem_payment_wallet BEFORE INSERT OR UPDATE OR DELETE ON public.moallem_payments FOR EACH ROW EXECUTE FUNCTION public.on_moallem_payment_wallet();

DROP TRIGGER IF EXISTS trg_update_moallem_on_deposit ON public.moallem_payments;
CREATE TRIGGER trg_update_moallem_on_deposit AFTER INSERT OR UPDATE OR DELETE ON public.moallem_payments FOR EACH ROW EXECUTE FUNCTION public.update_moallem_on_deposit();

DROP TRIGGER IF EXISTS trg_update_booking_moallem_paid ON public.moallem_payments;
CREATE TRIGGER trg_update_booking_moallem_paid AFTER INSERT OR UPDATE OR DELETE ON public.moallem_payments FOR EACH ROW EXECUTE FUNCTION public.update_booking_moallem_paid();

DROP TRIGGER IF EXISTS trg_on_supplier_payment_changed ON public.supplier_agent_payments;
CREATE TRIGGER trg_on_supplier_payment_changed AFTER INSERT OR UPDATE OR DELETE ON public.supplier_agent_payments FOR EACH ROW EXECUTE FUNCTION public.on_supplier_payment_changed();

DROP TRIGGER IF EXISTS trg_update_booking_supplier_paid ON public.supplier_agent_payments;
CREATE TRIGGER trg_update_booking_supplier_paid AFTER INSERT OR UPDATE OR DELETE ON public.supplier_agent_payments FOR EACH ROW EXECUTE FUNCTION public.update_booking_supplier_paid();

DROP TRIGGER IF EXISTS trg_notify_supplier_payment ON public.supplier_agent_payments;
CREATE TRIGGER trg_notify_supplier_payment AFTER INSERT ON public.supplier_agent_payments FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_payment();

DROP TRIGGER IF EXISTS trg_on_commission_payment_changed ON public.moallem_commission_payments;
CREATE TRIGGER trg_on_commission_payment_changed AFTER INSERT OR UPDATE OR DELETE ON public.moallem_commission_payments FOR EACH ROW EXECUTE FUNCTION public.on_commission_payment_changed();

DROP TRIGGER IF EXISTS trg_update_booking_commission_paid ON public.moallem_commission_payments;
CREATE TRIGGER trg_update_booking_commission_paid AFTER INSERT OR UPDATE OR DELETE ON public.moallem_commission_payments FOR EACH ROW EXECUTE FUNCTION public.update_booking_commission_paid();

DROP TRIGGER IF EXISTS trg_notify_commission_payment ON public.moallem_commission_payments;
CREATE TRIGGER trg_notify_commission_payment AFTER INSERT ON public.moallem_commission_payments FOR EACH ROW EXECUTE FUNCTION public.notify_commission_payment();

DROP TRIGGER IF EXISTS trg_on_expense_changed ON public.expenses;
CREATE TRIGGER trg_on_expense_changed AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.on_expense_changed();

DROP TRIGGER IF EXISTS trg_calculate_booking_profit ON public.bookings;
CREATE TRIGGER trg_calculate_booking_profit BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.calculate_booking_profit();

DROP TRIGGER IF EXISTS trg_update_moallem_on_booking ON public.bookings;
CREATE TRIGGER trg_update_moallem_on_booking AFTER INSERT OR UPDATE OR DELETE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_moallem_on_booking();

DROP TRIGGER IF EXISTS trg_notify_booking_created ON public.bookings;
CREATE TRIGGER trg_notify_booking_created AFTER INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_booking_created();

DROP TRIGGER IF EXISTS trg_notify_booking_status ON public.bookings;
CREATE TRIGGER trg_notify_booking_status AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_updated();

DROP TRIGGER IF EXISTS trg_notify_booking_completed ON public.bookings;
CREATE TRIGGER trg_notify_booking_completed AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_booking_completed();

DROP TRIGGER IF EXISTS trg_check_package_expiry ON public.packages;
CREATE TRIGGER trg_check_package_expiry BEFORE INSERT OR UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.check_package_expiry();

-- Add index for ledger queries
CREATE INDEX IF NOT EXISTS idx_transactions_source_type ON public.transactions(source_type);
CREATE INDEX IF NOT EXISTS idx_transactions_source_id ON public.transactions(source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON public.transactions(booking_id);
