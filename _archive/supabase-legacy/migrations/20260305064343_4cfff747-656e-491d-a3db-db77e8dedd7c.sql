
-- Fix moallem payment wallet trigger: moallem payments are INCOME (money coming IN), 
-- so wallet balance should INCREASE, not decrease. Remove the insufficient balance check.
CREATE OR REPLACE FUNCTION public.on_moallem_payment_wallet()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.wallet_account_id IS NOT NULL THEN
    -- Moallem payments are income: ADD to wallet
    UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old wallet change
    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance - OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
    END IF;
    -- Apply new wallet change (add income)
    IF NEW.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.wallet_account_id IS NOT NULL THEN
    -- Reverse: subtract the income that was added
    UPDATE public.accounts SET balance = balance - OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
