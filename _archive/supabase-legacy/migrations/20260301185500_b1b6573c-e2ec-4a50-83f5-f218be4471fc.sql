
-- 1) Create moallem_commission_payments table
CREATE TABLE IF NOT EXISTS public.moallem_commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  moallem_id UUID NOT NULL REFERENCES public.moallems(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  wallet_account_id UUID REFERENCES public.accounts(id),
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) RLS
ALTER TABLE public.moallem_commission_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission payments"
  ON public.moallem_commission_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view commission payments"
  ON public.moallem_commission_payments FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'accountant'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role) OR
    has_role(auth.uid(), 'viewer'::app_role)
  );

-- 3) Update calculate_booking_profit to include commission
CREATE OR REPLACE FUNCTION public.calculate_booking_profit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  NEW.total_amount := COALESCE(NEW.selling_price_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  NEW.total_cost := COALESCE(NEW.cost_price_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  NEW.total_commission := COALESCE(NEW.commission_per_person, 0) * COALESCE(NEW.num_travelers, 1);
  NEW.commission_due := GREATEST(0, COALESCE(NEW.total_commission, 0) - COALESCE(NEW.commission_paid, 0));
  NEW.profit_amount := NEW.total_amount - COALESCE(NEW.total_cost, 0) - COALESCE(NEW.total_commission, 0) - COALESCE(NEW.extra_expense, 0);
  NEW.due_amount := GREATEST(0, NEW.total_amount - COALESCE(NEW.paid_amount, 0));
  NEW.supplier_due := GREATEST(0, COALESCE(NEW.total_cost, 0) - COALESCE(NEW.paid_to_supplier, 0));
  IF NEW.moallem_id IS NOT NULL THEN
    NEW.moallem_due := GREATEST(0, NEW.total_amount - COALESCE(NEW.paid_by_moallem, 0));
  ELSE
    NEW.moallem_due := 0;
    NEW.commission_per_person := 0;
    NEW.total_commission := 0;
    NEW.commission_paid := 0;
    NEW.commission_due := 0;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) Trigger: update booking commission_paid when commission payments change
CREATE OR REPLACE FUNCTION public.update_booking_commission_paid()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_id UUID;
  v_total_paid NUMERIC;
  v_total_commission NUMERIC;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  
  IF v_booking_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.moallem_commission_payments
  WHERE booking_id = v_booking_id;

  SELECT COALESCE(total_commission, 0) INTO v_total_commission
  FROM public.bookings WHERE id = v_booking_id;

  UPDATE public.bookings
  SET commission_paid = v_total_paid,
      commission_due = GREATEST(0, v_total_commission - v_total_paid)
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE TRIGGER trg_update_booking_commission_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.moallem_commission_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_commission_paid();

-- 5) Trigger: commission payment creates expense transaction + wallet + financial_summary
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
  -- Wallet handling
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

  -- Transaction handling
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (type, category, amount, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'commission_payment', NEW.amount,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Commission payment to ' || COALESCE(v_moallem_name, 'Unknown'),
      NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'UPDATE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'commission_payment';
    INSERT INTO public.transactions (type, category, amount, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'commission_payment', NEW.amount,
      COALESCE(NEW.recorded_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.date, 'Commission payment to ' || COALESCE(v_moallem_name, 'Unknown'),
      NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'commission_payment';
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

CREATE TRIGGER trg_on_commission_payment_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.moallem_commission_payments
  FOR EACH ROW EXECUTE FUNCTION public.on_commission_payment_changed();
