
-- Fix 1: Drop the overly permissive public tracking policy on bookings
DROP POLICY IF EXISTS "Public tracking by tracking_id" ON public.bookings;

-- Fix 2: Enable RLS on otp_codes and deny all user access (only service role can access)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes FORCE ROW LEVEL SECURITY;
