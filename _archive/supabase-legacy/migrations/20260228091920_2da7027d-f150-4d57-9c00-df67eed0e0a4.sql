
-- Trigger: when an expense is created/updated/deleted, update financial_summary and expense account
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
BEGIN
  -- Recalculate total expenses from expenses table
  SELECT COALESCE(SUM(amount), 0) INTO v_expense_total FROM public.expenses;

  -- Update expense account
  IF EXISTS (SELECT 1 FROM public.accounts WHERE type = 'expense' AND name = 'Operating Expenses') THEN
    UPDATE public.accounts SET balance = v_expense_total, updated_at = now()
    WHERE type = 'expense' AND name = 'Operating Expenses';
  ELSE
    INSERT INTO public.accounts (name, type, balance) VALUES ('Operating Expenses', 'expense', v_expense_total);
  END IF;

  -- Recalculate financial summary
  SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expense
  FROM public.transactions;

  -- Add direct expenses (not in transactions table)
  v_total_expense := v_total_expense + v_expense_total;

  IF EXISTS (SELECT 1 FROM public.financial_summary LIMIT 1) THEN
    UPDATE public.financial_summary
    SET total_expense = v_total_expense,
        total_income = v_total_income,
        net_profit = v_total_income - v_total_expense,
        updated_at = now();
  ELSE
    INSERT INTO public.financial_summary (total_income, total_expense, net_profit)
    VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_on_expense_changed
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.on_expense_changed();
