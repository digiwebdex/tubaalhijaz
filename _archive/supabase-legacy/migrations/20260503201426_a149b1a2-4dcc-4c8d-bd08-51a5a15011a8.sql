CREATE TABLE IF NOT EXISTS public.online_payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tran_id TEXT NOT NULL UNIQUE,
  booking_id UUID REFERENCES public.bookings(id),
  user_id UUID,
  customer_phone TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  status TEXT NOT NULL DEFAULT 'initiated',
  gateway TEXT NOT NULL DEFAULT 'sslcommerz',
  gateway_response JSONB,
  payment_id UUID REFERENCES public.payments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_booking ON public.online_payment_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_ops_status ON public.online_payment_sessions(status);

ALTER TABLE public.online_payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage online payment sessions"
ON public.online_payment_sessions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own payment sessions"
ON public.online_payment_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());