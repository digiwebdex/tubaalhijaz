
-- Function to auto-assign wallet_account_id based on payment_method
CREATE OR REPLACE FUNCTION public.auto_assign_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Only assign if wallet_account_id is not already set
  IF NEW.wallet_account_id IS NULL AND NEW.payment_method IS NOT NULL THEN
    SELECT id INTO v_wallet_id FROM public.accounts
    WHERE type = 'asset' AND (
      (NEW.payment_method = 'cash' AND name = 'Cash') OR
      (NEW.payment_method = 'manual' AND name = 'Cash') OR
      (NEW.payment_method = 'bank' AND name = 'Bank') OR
      (NEW.payment_method = 'bank_transfer' AND name = 'Bank') OR
      (NEW.payment_method = 'bkash' AND name = 'bKash') OR
      (NEW.payment_method = 'nagad' AND name = 'Nagad') OR
      (NEW.payment_method = 'online' AND name = 'Bank')
    ) LIMIT 1;

    IF v_wallet_id IS NOT NULL THEN
      NEW.wallet_account_id := v_wallet_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply to payments table (BEFORE INSERT/UPDATE so wallet triggers fire correctly)
DROP TRIGGER IF EXISTS trg_auto_wallet_payments ON public.payments;
CREATE TRIGGER trg_auto_wallet_payments
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_wallet();

-- Apply to moallem_payments table
DROP TRIGGER IF EXISTS trg_auto_wallet_moallem_payments ON public.moallem_payments;
CREATE TRIGGER trg_auto_wallet_moallem_payments
  BEFORE INSERT OR UPDATE ON public.moallem_payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_wallet();

-- Apply to supplier_agent_payments table
DROP TRIGGER IF EXISTS trg_auto_wallet_supplier_payments ON public.supplier_agent_payments;
CREATE TRIGGER trg_auto_wallet_supplier_payments
  BEFORE INSERT OR UPDATE ON public.supplier_agent_payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_wallet();

-- Apply to moallem_commission_payments table
DROP TRIGGER IF EXISTS trg_auto_wallet_commission_payments ON public.moallem_commission_payments;
CREATE TRIGGER trg_auto_wallet_commission_payments
  BEFORE INSERT OR UPDATE ON public.moallem_commission_payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_wallet();

-- Apply to supplier_contract_payments table
DROP TRIGGER IF EXISTS trg_auto_wallet_contract_payments ON public.supplier_contract_payments;
CREATE TRIGGER trg_auto_wallet_contract_payments
  BEFORE INSERT OR UPDATE ON public.supplier_contract_payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_wallet();
