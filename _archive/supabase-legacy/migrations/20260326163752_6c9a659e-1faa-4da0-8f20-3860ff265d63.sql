
-- FIX 1: Auto-assign wallet_account_id to payments missing it
UPDATE payments
SET wallet_account_id = (
  SELECT a.id FROM accounts a
  WHERE a.type = 'asset' AND (
    (payments.payment_method IN ('bank', 'bank_transfer', 'online') AND a.name = 'Bank') OR
    (payments.payment_method IN ('cash', 'manual') AND a.name = 'Cash') OR
    (payments.payment_method = 'bkash' AND a.name = 'bKash') OR
    (payments.payment_method = 'nagad' AND a.name = 'Nagad')
  )
  LIMIT 1
)
WHERE wallet_account_id IS NULL AND status = 'completed';

-- FIX 2: Recalculate ALL booking paid_amount/due_amount
UPDATE bookings b
SET paid_amount = sub.actual_paid,
    due_amount = GREATEST(0, b.total_amount - sub.actual_paid),
    status = CASE WHEN sub.actual_paid >= b.total_amount THEN 'completed' ELSE b.status END
FROM (
  SELECT booking_id, COALESCE(SUM(amount), 0) as actual_paid
  FROM payments WHERE status = 'completed'
  GROUP BY booking_id
) sub
WHERE b.id = sub.booking_id AND b.paid_amount != sub.actual_paid;

-- FIX 3: Reset asset wallet balances to 0
UPDATE accounts SET balance = 0, updated_at = now() WHERE type = 'asset';

-- Add completed customer payments (income)
UPDATE accounts a SET balance = balance + sub.total, updated_at = now()
FROM (
  SELECT wallet_account_id, SUM(amount) as total
  FROM payments WHERE status = 'completed' AND wallet_account_id IS NOT NULL
  GROUP BY wallet_account_id
) sub WHERE a.id = sub.wallet_account_id;

-- Add moallem payments (income)
UPDATE accounts a SET balance = balance + sub.total, updated_at = now()
FROM (
  SELECT wallet_account_id, SUM(amount) as total
  FROM moallem_payments WHERE wallet_account_id IS NOT NULL
  GROUP BY wallet_account_id
) sub WHERE a.id = sub.wallet_account_id;

-- Subtract supplier agent payments (expense)
UPDATE accounts a SET balance = balance - sub.total, updated_at = now()
FROM (
  SELECT wallet_account_id, SUM(amount) as total
  FROM supplier_agent_payments WHERE wallet_account_id IS NOT NULL
  GROUP BY wallet_account_id
) sub WHERE a.id = sub.wallet_account_id;

-- Subtract commission payments (expense)
UPDATE accounts a SET balance = balance - sub.total, updated_at = now()
FROM (
  SELECT wallet_account_id, SUM(amount) as total
  FROM moallem_commission_payments WHERE wallet_account_id IS NOT NULL
  GROUP BY wallet_account_id
) sub WHERE a.id = sub.wallet_account_id;

-- Subtract expenses
UPDATE accounts a SET balance = balance - sub.total, updated_at = now()
FROM (
  SELECT wallet_account_id, SUM(amount) as total
  FROM expenses WHERE wallet_account_id IS NOT NULL
  GROUP BY wallet_account_id
) sub WHERE a.id = sub.wallet_account_id;

-- Subtract supplier contract payments
UPDATE accounts a SET balance = balance - sub.total, updated_at = now()
FROM (
  SELECT wallet_account_id, SUM(amount) as total
  FROM supplier_contract_payments WHERE wallet_account_id IS NOT NULL
  GROUP BY wallet_account_id
) sub WHERE a.id = sub.wallet_account_id;

-- Add daily cashbook income
UPDATE accounts a SET balance = balance + sub.total, updated_at = now()
FROM (
  SELECT wallet_account_id, SUM(amount) as total
  FROM daily_cashbook WHERE type = 'income' AND wallet_account_id IS NOT NULL
  GROUP BY wallet_account_id
) sub WHERE a.id = sub.wallet_account_id;

-- Subtract daily cashbook expense
UPDATE accounts a SET balance = balance - sub.total, updated_at = now()
FROM (
  SELECT wallet_account_id, SUM(amount) as total
  FROM daily_cashbook WHERE type = 'expense' AND wallet_account_id IS NOT NULL
  GROUP BY wallet_account_id
) sub WHERE a.id = sub.wallet_account_id;

-- FIX 4: Recalculate Revenue account
UPDATE accounts SET balance = (SELECT COALESCE(SUM(debit), 0) FROM transactions), updated_at = now()
WHERE type = 'income' AND name = 'Revenue';

-- FIX 5: Recalculate Operating Expenses
UPDATE accounts SET balance = (SELECT COALESCE(SUM(amount), 0) FROM expenses), updated_at = now()
WHERE type = 'expense' AND name = 'Operating Expenses';

-- FIX 6: Recalculate financial_summary
UPDATE financial_summary SET
  total_income = (SELECT COALESCE(SUM(debit), 0) FROM transactions),
  total_expense = (SELECT COALESCE(SUM(credit), 0) FROM transactions) + (SELECT COALESCE(SUM(amount), 0) FROM expenses),
  net_profit = (SELECT COALESCE(SUM(debit), 0) FROM transactions) - ((SELECT COALESCE(SUM(credit), 0) FROM transactions) + (SELECT COALESCE(SUM(amount), 0) FROM expenses)),
  updated_at = now()
WHERE id IS NOT NULL
