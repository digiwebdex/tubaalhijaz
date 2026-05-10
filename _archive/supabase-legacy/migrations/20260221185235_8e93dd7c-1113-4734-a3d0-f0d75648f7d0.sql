
-- OTP codes table for phone login
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- No public access - only edge functions (service role) manage OTP codes
-- Users cannot read/write OTP codes directly

-- Auto-cleanup old OTP codes (optional index for performance)
CREATE INDEX idx_otp_codes_phone_expires ON public.otp_codes (phone, expires_at);

-- Add phone column to profiles if not exists (it already exists per schema)
