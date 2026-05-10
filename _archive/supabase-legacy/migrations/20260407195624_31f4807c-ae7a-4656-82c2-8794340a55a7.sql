-- ═══════════════════════════════════════════════════════════════
-- FIX: Remove duplicate wallet triggers causing double-counting
-- ═══════════════════════════════════════════════════════════════

-- 1. Customer payments: trg_payment_insert_wallet duplicates trg_on_payment_completed
DROP TRIGGER IF EXISTS trg_payment_insert_wallet ON public.payments;

-- 2. Moallem payments: trg_moallem_payment_insert_wallet duplicates trg_on_moallem_payment_wallet
DROP TRIGGER IF EXISTS trg_moallem_payment_insert_wallet ON public.moallem_payments;

-- 3. Supplier payments: trg_supplier_payment_insert_wallet duplicates trg_on_supplier_payment_changed
DROP TRIGGER IF EXISTS trg_supplier_payment_insert_wallet ON public.supplier_agent_payments;

-- 4. Expenses insert: trg_expense_insert_wallet duplicates trg_on_expense_changed
DROP TRIGGER IF EXISTS trg_expense_insert_wallet ON public.expenses;

-- 5. Expenses delete: trg_expense_delete_wallet duplicates trg_on_expense_changed
DROP TRIGGER IF EXISTS trg_expense_delete_wallet ON public.expenses;

-- ═══════════════════════════════════════════════════════════════
-- UTILITY: Wallet balance recalculation function
-- Run this to fix historically corrupted balances:
--   SELECT recalculate_wallet_balances();
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.recalculate_wallet_balances()
RETURNS TABLE(account_name TEXT, old_balance NUMERIC, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_inflow NUMERIC;
  v_outflow NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  FOR r IN SELECT id, name, balance FROM public.accounts WHERE type = 'asset' LOOP
    -- INFLOWS: customer payments (completed) + moallem payments + cashbook income
    SELECT COALESCE(SUM(amount), 0) INTO v_inflow
    FROM (
      SELECT amount FROM public.payments WHERE wallet_account_id = r.id AND status = 'completed'
      UNION ALL
      SELECT amount FROM public.moallem_payments WHERE wallet_account_id = r.id
      UNION ALL
      SELECT amount FROM public.daily_cashbook WHERE wallet_account_id = r.id AND type = 'income'
    ) inflows;

    -- OUTFLOWS: supplier payments + commission payments + supplier contract payments + expenses + cashbook expense
    SELECT COALESCE(SUM(amount), 0) INTO v_outflow
    FROM (
      SELECT amount FROM public.supplier_agent_payments WHERE wallet_account_id = r.id
      UNION ALL
      SELECT amount FROM public.moallem_commission_payments WHERE wallet_account_id = r.id
      UNION ALL
      SELECT amount FROM public.supplier_contract_payments WHERE wallet_account_id = r.id
      UNION ALL
      SELECT amount FROM public.expenses WHERE wallet_account_id = r.id
      UNION ALL
      SELECT amount FROM public.daily_cashbook WHERE wallet_account_id = r.id AND type = 'expense'
      UNION ALL
      SELECT refund_amount FROM public.refunds WHERE wallet_account_id = r.id AND status = 'processed'
    ) outflows;

    v_new_balance := v_inflow - v_outflow;

    account_name := r.name;
    old_balance := r.balance;
    new_balance := v_new_balance;
    RETURN NEXT;

    UPDATE public.accounts SET balance = v_new_balance, updated_at = now() WHERE id = r.id;
  END LOOP;
END;
$$;