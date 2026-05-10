
-- Create trigger function for moallem payment income transactions
-- Similar to on_supplier_payment_changed but for income side
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
    INSERT INTO public.transactions (type, category, amount, user_id, date, note, payment_method, reference, booking_id)
    VALUES ('income', 'moallem_payment', NEW.amount,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Moallem payment from ' || COALESCE(v_moallem_name, 'Unknown'),
      NEW.payment_method, NEW.id::text, NEW.booking_id);

    -- Update Revenue account
    UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';
    IF NOT FOUND THEN
      INSERT INTO public.accounts (name, type, balance) VALUES ('Revenue', 'income', NEW.amount);
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Remove old transaction and revenue
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'income' AND category = 'moallem_payment';
    UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.amount), updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';

    -- Add new transaction and revenue
    INSERT INTO public.transactions (type, category, amount, user_id, date, note, payment_method, reference, booking_id)
    VALUES ('income', 'moallem_payment', NEW.amount,
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

  -- Recalculate financial summary
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

-- Create triggers for moallem payment income
CREATE TRIGGER trg_moallem_payment_income_insert
  AFTER INSERT ON public.moallem_payments
  FOR EACH ROW EXECUTE FUNCTION on_moallem_payment_income();

CREATE TRIGGER trg_moallem_payment_income_update
  AFTER UPDATE ON public.moallem_payments
  FOR EACH ROW EXECUTE FUNCTION on_moallem_payment_income();

CREATE TRIGGER trg_moallem_payment_income_delete
  AFTER DELETE ON public.moallem_payments
  FOR EACH ROW EXECUTE FUNCTION on_moallem_payment_income();
