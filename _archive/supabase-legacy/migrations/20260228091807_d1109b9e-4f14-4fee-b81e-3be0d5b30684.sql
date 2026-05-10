
-- Create trigger function: when payment is marked completed, auto-create income transaction + update financial_summary
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
BEGIN
  -- Only fire when status just changed to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN

    -- Get booking info
    SELECT id, tracking_id, package_id, user_id INTO v_booking
    FROM public.bookings WHERE id = NEW.booking_id;

    -- 1. Create income transaction
    INSERT INTO public.transactions (
      type, category, amount, booking_id, user_id, date, note, payment_method, customer_id, reference
    ) VALUES (
      'income',
      'payment',
      NEW.amount,
      NEW.booking_id,
      COALESCE(NEW.user_id, v_booking.user_id, '00000000-0000-0000-0000-000000000000'::uuid),
      CURRENT_DATE,
      'Payment #' || COALESCE(NEW.installment_number::text, 'N/A') || ' for ' || COALESCE(v_booking.tracking_id, ''),
      NEW.payment_method,
      NEW.customer_id,
      NEW.id::text
    );

    -- 2. Update income account balance
    UPDATE public.accounts
    SET balance = balance + NEW.amount, updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';

    -- If no Revenue account exists, create one
    IF NOT FOUND THEN
      INSERT INTO public.accounts (name, type, balance) VALUES ('Revenue', 'income', NEW.amount);
    END IF;

    -- 3. Upsert financial_summary (single row)
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_total_income, v_total_expense
    FROM public.transactions;

    IF EXISTS (SELECT 1 FROM public.financial_summary LIMIT 1) THEN
      UPDATE public.financial_summary
      SET total_income = v_total_income,
          total_expense = v_total_expense,
          net_profit = v_total_income - v_total_expense,
          updated_at = now();
    ELSE
      INSERT INTO public.financial_summary (total_income, total_expense, net_profit)
      VALUES (v_total_income, v_total_expense, v_total_income - v_total_expense);
    END IF;

  END IF;

  -- Handle reversal: if status changed FROM completed to something else
  IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    -- Remove the income transaction
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'income';

    -- Update account
    UPDATE public.accounts SET balance = balance - OLD.amount, updated_at = now()
    WHERE type = 'income' AND name = 'Revenue';

    -- Recalculate summary
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
    INTO v_total_income, v_total_expense
    FROM public.transactions;

    UPDATE public.financial_summary
    SET total_income = v_total_income,
        total_expense = v_total_expense,
        net_profit = v_total_income - v_total_expense,
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on payments table (runs AFTER the existing update_booking_paid_amount trigger)
CREATE TRIGGER trg_on_payment_completed
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.on_payment_completed();
