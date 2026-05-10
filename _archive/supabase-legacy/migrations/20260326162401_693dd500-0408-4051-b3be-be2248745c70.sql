
-- Cancellation policies table
CREATE TABLE public.cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  refund_type TEXT NOT NULL DEFAULT 'percentage' CHECK (refund_type IN ('percentage', 'flat')),
  refund_value NUMERIC NOT NULL DEFAULT 0,
  min_days_before_departure INTEGER DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cancellation policies" ON public.cancellation_policies FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view active policies" ON public.cancellation_policies FOR SELECT USING (is_active = true);

-- Refunds table
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.cancellation_policies(id),
  original_amount NUMERIC NOT NULL DEFAULT 0,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  deduction_amount NUMERIC NOT NULL DEFAULT 0,
  refund_method TEXT DEFAULT 'cash' CHECK (refund_method IN ('cash', 'bkash', 'nagad', 'bank', 'bank_transfer')),
  wallet_account_id UUID REFERENCES public.accounts(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage refunds" ON public.refunds FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view refunds" ON public.refunds FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'viewer'::app_role)
);

-- Trigger to update wallet and booking on refund processed
CREATE OR REPLACE FUNCTION public.on_refund_processed()
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
  IF NEW.status = 'processed' AND (OLD.status IS NULL OR OLD.status <> 'processed') THEN
    -- Deduct from wallet
    IF NEW.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance - NEW.refund_amount, updated_at = now() WHERE id = NEW.wallet_account_id;
    END IF;

    -- Update booking status to cancelled and adjust paid_amount
    SELECT * INTO v_booking FROM public.bookings WHERE id = NEW.booking_id;
    
    UPDATE public.bookings
    SET status = 'cancelled',
        paid_amount = GREATEST(0, paid_amount - NEW.refund_amount),
        due_amount = 0,
        updated_at = now()
    WHERE id = NEW.booking_id;

    -- Record in transactions as expense (refund outflow)
    INSERT INTO public.transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference, booking_id)
    VALUES ('expense', 'refund', NEW.refund_amount, 0, NEW.refund_amount, 'refund', NEW.id,
      COALESCE(NEW.processed_by, '00000000-0000-0000-0000-000000000000'::uuid),
      CURRENT_DATE, 'Refund for booking ' || COALESCE(v_booking.tracking_id, ''),
      NEW.refund_method, NEW.id::text, NEW.booking_id);

    -- Update financial summary
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

    NEW.processed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_refund_processed
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION on_refund_processed();
