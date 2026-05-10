
-- Function to update wallet balance on daily_cashbook insert
CREATE OR REPLACE FUNCTION public.update_wallet_on_cashbook_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.wallet_account_id IS NOT NULL THEN
    IF NEW.type = 'income' THEN
      UPDATE accounts SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to update wallet balance on daily_cashbook delete
CREATE OR REPLACE FUNCTION public.update_wallet_on_cashbook_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.wallet_account_id IS NOT NULL THEN
    IF OLD.type = 'income' THEN
      UPDATE accounts SET balance = balance - OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

-- Function to update wallet balance on daily_cashbook update
CREATE OR REPLACE FUNCTION public.update_wallet_on_cashbook_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.wallet_account_id IS NOT NULL THEN
    IF OLD.type = 'income' THEN
      UPDATE accounts SET balance = balance - OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
    END IF;
  END IF;
  IF NEW.wallet_account_id IS NOT NULL THEN
    IF NEW.type = 'income' THEN
      UPDATE accounts SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cashbook_insert_wallet AFTER INSERT ON public.daily_cashbook FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_cashbook_insert();
CREATE TRIGGER trg_cashbook_delete_wallet AFTER DELETE ON public.daily_cashbook FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_cashbook_delete();
CREATE TRIGGER trg_cashbook_update_wallet AFTER UPDATE ON public.daily_cashbook FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_cashbook_update();

-- Payments insert/delete triggers (income to wallet)
CREATE OR REPLACE FUNCTION public.update_wallet_on_payment_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.wallet_account_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE accounts SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_wallet_on_payment_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.wallet_account_id IS NOT NULL AND OLD.status = 'completed' THEN
    UPDATE accounts SET balance = balance - OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_payment_insert_wallet AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_payment_insert();
CREATE TRIGGER trg_payment_delete_wallet AFTER DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_payment_delete();

-- Expenses insert/delete triggers (deduct from wallet)
CREATE OR REPLACE FUNCTION public.update_wallet_on_expense_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.wallet_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_wallet_on_expense_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.wallet_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + OLD.amount, updated_at = now() WHERE id = OLD.wallet_account_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_expense_insert_wallet AFTER INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_expense_insert();
CREATE TRIGGER trg_expense_delete_wallet AFTER DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_expense_delete();

-- Moallem payments (income to wallet)
CREATE OR REPLACE FUNCTION public.update_wallet_on_moallem_payment_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.wallet_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_moallem_payment_insert_wallet AFTER INSERT ON public.moallem_payments FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_moallem_payment_insert();

-- Supplier payments (expense from wallet)
CREATE OR REPLACE FUNCTION public.update_wallet_on_supplier_payment_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.wallet_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.wallet_account_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_supplier_payment_insert_wallet AFTER INSERT ON public.supplier_agent_payments FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_supplier_payment_insert();
