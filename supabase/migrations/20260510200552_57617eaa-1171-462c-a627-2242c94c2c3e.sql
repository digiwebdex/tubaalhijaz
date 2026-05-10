-- Add 'agent' to app_role enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'agent'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'agent';
  END IF;
END$$;

-- Link supplier_agents to a user account + commission percentage
ALTER TABLE public.supplier_agents
  ADD COLUMN IF NOT EXISTS agent_user_id UUID,
  ADD COLUMN IF NOT EXISTS commission_pct NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_supplier_agents_agent_user_id
  ON public.supplier_agents(agent_user_id);

-- Allow the linked agent to view their own supplier_agents record
DROP POLICY IF EXISTS "Agent can view own supplier_agents" ON public.supplier_agents;
CREATE POLICY "Agent can view own supplier_agents"
  ON public.supplier_agents FOR SELECT
  USING (agent_user_id = auth.uid());

-- agent_commissions
CREATE TABLE IF NOT EXISTS public.agent_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_agent_id UUID NOT NULL,
  booking_id UUID,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  commission_pct NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_commissions_supplier_agent
  ON public.agent_commissions(supplier_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_booking
  ON public.agent_commissions(booking_id);

ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage agent commissions" ON public.agent_commissions;
CREATE POLICY "Admins manage agent commissions"
  ON public.agent_commissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Agents view own commissions" ON public.agent_commissions;
CREATE POLICY "Agents view own commissions"
  ON public.agent_commissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.supplier_agents sa
    WHERE sa.id = agent_commissions.supplier_agent_id
      AND sa.agent_user_id = auth.uid()
  ));

-- commission_payouts
CREATE TABLE IF NOT EXISTS public.commission_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_agent_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  wallet_account_id UUID,
  reference TEXT,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commission_payouts_supplier_agent
  ON public.commission_payouts(supplier_agent_id);

ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage commission payouts" ON public.commission_payouts;
CREATE POLICY "Admins manage commission payouts"
  ON public.commission_payouts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Agents view own payouts" ON public.commission_payouts;
CREATE POLICY "Agents view own payouts"
  ON public.commission_payouts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.supplier_agents sa
    WHERE sa.id = commission_payouts.supplier_agent_id
      AND sa.agent_user_id = auth.uid()
  ));

-- updated_at trigger for agent_commissions
DROP TRIGGER IF EXISTS trg_updated_at_agent_commissions ON public.agent_commissions;
CREATE TRIGGER trg_updated_at_agent_commissions
  BEFORE UPDATE ON public.agent_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();