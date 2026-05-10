
-- Drop all existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS trg_on_payment_completed ON public.payments;
DROP TRIGGER IF EXISTS trg_update_booking_paid_amount ON public.payments;
DROP TRIGGER IF EXISTS trg_notify_payment_completed ON public.payments;
DROP TRIGGER IF EXISTS trg_update_moallem_on_booking ON public.bookings;
DROP TRIGGER IF EXISTS trg_notify_booking_completed ON public.bookings;
DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS trg_on_expense_changed ON public.expenses;
DROP TRIGGER IF EXISTS trg_update_moallem_on_deposit ON public.moallem_payments;
DROP TRIGGER IF EXISTS trg_on_moallem_payment_wallet ON public.moallem_payments;
DROP TRIGGER IF EXISTS trg_check_package_expiry ON public.packages;
DROP TRIGGER IF EXISTS trg_packages_updated_at ON public.packages;
DROP TRIGGER IF EXISTS trg_hotels_updated_at ON public.hotels;
DROP TRIGGER IF EXISTS trg_moallems_updated_at ON public.moallems;
DROP TRIGGER IF EXISTS trg_supplier_agents_updated_at ON public.supplier_agents;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trg_on_supplier_payment_changed ON public.supplier_agent_payments;

-- =============================================
-- 1. PAYMENTS → Income + Booking update + Notification
-- =============================================
CREATE TRIGGER trg_on_payment_completed
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.on_payment_completed();

CREATE TRIGGER trg_update_booking_paid_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_paid_amount();

CREATE TRIGGER trg_notify_payment_completed
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_completed();

-- =============================================
-- 2. BOOKINGS → Moallem stats + Notification + updated_at
-- =============================================
CREATE TRIGGER trg_update_moallem_on_booking
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_moallem_on_booking();

CREATE TRIGGER trg_notify_booking_completed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_completed();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. EXPENSES → Financial summary + Wallet
-- =============================================
CREATE TRIGGER trg_on_expense_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.on_expense_changed();

-- =============================================
-- 4. MOALLEM PAYMENTS → Moallem stats + Wallet
-- =============================================
CREATE TRIGGER trg_update_moallem_on_deposit
  AFTER INSERT OR UPDATE OR DELETE ON public.moallem_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_moallem_on_deposit();

CREATE OR REPLACE FUNCTION public.on_moallem_payment_wallet()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_wallet_balance NUMERIC;
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
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER trg_on_moallem_payment_wallet
  BEFORE INSERT OR UPDATE OR DELETE ON public.moallem_payments
  FOR EACH ROW EXECUTE FUNCTION public.on_moallem_payment_wallet();

-- =============================================
-- 5. SUPPLIER AGENT PAYMENTS → Wallet + Expense transaction + Financial summary
-- =============================================
CREATE OR REPLACE FUNCTION public.on_supplier_payment_changed()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
    INSERT INTO public.transactions (type, category, amount, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'supplier_payment', NEW.amount,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Supplier payment to ' || COALESCE(v_agent_name, 'Unknown'),
      NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'supplier_payment';
    INSERT INTO public.transactions (type, category, amount, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'supplier_payment', NEW.amount,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Supplier payment to ' || COALESCE(v_agent_name, 'Unknown'),
      NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'supplier_payment';
  END IF;

  SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
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

CREATE TRIGGER trg_on_supplier_payment_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_agent_payments
  FOR EACH ROW EXECUTE FUNCTION public.on_supplier_payment_changed();

-- =============================================
-- 6. PACKAGES → Auto-expire + updated_at
-- =============================================
CREATE TRIGGER trg_check_package_expiry
  BEFORE INSERT OR UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.check_package_expiry();

CREATE TRIGGER trg_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 7. updated_at TRIGGERS for other tables
-- =============================================
CREATE TRIGGER trg_hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_moallems_updated_at
  BEFORE UPDATE ON public.moallems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_supplier_agents_updated_at
  BEFORE UPDATE ON public.supplier_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
