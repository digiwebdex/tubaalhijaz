
-- Fix security definer views by setting them to security invoker
ALTER VIEW public.v_booking_profit SET (security_invoker = on);
ALTER VIEW public.v_package_profit SET (security_invoker = on);
ALTER VIEW public.v_customer_profit SET (security_invoker = on);
