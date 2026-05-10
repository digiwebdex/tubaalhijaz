
-- Fix security definer view by setting security_invoker
ALTER VIEW public.v_booking_profit SET (security_invoker = on);
