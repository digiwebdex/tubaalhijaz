
CREATE OR REPLACE FUNCTION public.auto_assign_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet_id UUID;
  v_method TEXT;
BEGIN
  -- Default payment_method to 'cash' if not set
  IF NEW.payment_method IS NULL OR NEW.payment_method = '' THEN
    NEW.payment_method := 'cash';
  END IF;

  v_method := NEW.payment_method;

  -- Only assign if wallet_account_id is not already set
  IF NEW.wallet_account_id IS NULL THEN
    SELECT id INTO v_wallet_id FROM public.accounts
    WHERE type = 'asset' AND (
      (v_method = 'cash' AND name = 'Cash') OR
      (v_method = 'manual' AND name = 'Cash') OR
      (v_method = 'bank' AND name = 'Bank') OR
      (v_method = 'bank_transfer' AND name = 'Bank') OR
      (v_method = 'bkash' AND name = 'bKash') OR
      (v_method = 'nagad' AND name = 'Nagad') OR
      (v_method = 'online' AND name = 'Bank')
    ) LIMIT 1;

    IF v_wallet_id IS NOT NULL THEN
      NEW.wallet_account_id := v_wallet_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
