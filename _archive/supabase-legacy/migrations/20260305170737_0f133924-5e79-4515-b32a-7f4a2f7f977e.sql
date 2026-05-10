
-- Supplier Contracts table
CREATE TABLE public.supplier_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.supplier_agents(id) ON DELETE CASCADE,
  pilgrim_count INTEGER NOT NULL DEFAULT 0,
  contract_amount NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  total_due NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Supplier Contract Payments table
CREATE TABLE public.supplier_contract_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.supplier_agents(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.supplier_contracts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  wallet_account_id UUID REFERENCES public.accounts(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contract_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplier_contracts
CREATE POLICY "Admins can manage supplier contracts" ON public.supplier_contracts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view supplier contracts" ON public.supplier_contracts FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR 
  has_role(auth.uid(), 'viewer'::app_role)
);

-- RLS Policies for supplier_contract_payments
CREATE POLICY "Admins can manage supplier contract payments" ON public.supplier_contract_payments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view supplier contract payments" ON public.supplier_contract_payments FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR 
  has_role(auth.uid(), 'viewer'::app_role)
);

-- Trigger: Update contract totals and create ledger entry on payment
CREATE OR REPLACE FUNCTION public.on_supplier_contract_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_paid NUMERIC;
  v_contract_amount NUMERIC;
  v_supplier_name TEXT;
  v_wallet_balance NUMERIC;
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_expense_total NUMERIC;
BEGIN
  -- Wallet balance check on INSERT
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    SELECT balance INTO v_wallet_balance FROM public.accounts WHERE id = NEW.wallet_account_id;
    IF v_wallet_balance < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Required: %', v_wallet_balance, NEW.amount;
    END IF;
    UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    UPDATE public.accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;

  -- Update contract totals
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.supplier_contract_payments
  WHERE contract_id = COALESCE(NEW.contract_id, OLD.contract_id);

  SELECT contract_amount INTO v_contract_amount
  FROM public.supplier_contracts
  WHERE id = COALESCE(NEW.contract_id, OLD.contract_id);

  UPDATE public.supplier_contracts
  SET total_paid = v_total_paid,
      total_due = GREATEST(0, contract_amount - v_total_paid)
  WHERE id = COALESCE(NEW.contract_id, OLD.contract_id);

  -- Ledger entry
  SELECT agent_name INTO v_supplier_name FROM public.supplier_agents
  WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference)
    VALUES ('expense', 'supplier_contract_payment', NEW.amount, 0, NEW.amount, 'supplier', NEW.supplier_id,
      COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.payment_date, 'Supplier contract payment to ' || COALESCE(v_supplier_name, 'Unknown'),
      NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND type = 'expense' AND category = 'supplier_contract_payment';
  END IF;

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

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_supplier_contract_payment
AFTER INSERT OR DELETE ON public.supplier_contract_payments
FOR EACH ROW EXECUTE FUNCTION public.on_supplier_contract_payment();
