CREATE TABLE IF NOT EXISTS public.admin_2fa (
  user_id UUID PRIMARY KEY,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  sms_phone TEXT,
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  totp_secret TEXT,
  totp_secret_pending TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_2fa_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_2fa_codes_user ON public.admin_2fa_codes(user_id, created_at DESC);

ALTER TABLE public.admin_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_2fa_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage their own 2FA settings"
  ON public.admin_2fa FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id)
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);