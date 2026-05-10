
-- Fix security definer view by setting security_invoker
ALTER VIEW public.v_booking_profit SET (security_invoker = on);
ALTER VIEW public.v_customer_profit SET (security_invoker = on);
ALTER VIEW public.v_package_profit SET (security_invoker = on);

-- Update trigger to also set due_amount
CREATE OR REPLACE FUNCTION public.update_booking_paid_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_paid NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.payments
  WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
    AND status = 'completed';

  SELECT total_amount INTO v_total_amount
  FROM public.bookings
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  v_total_paid := GREATEST(0, LEAST(v_total_paid, v_total_amount));

  UPDATE public.bookings
  SET paid_amount = v_total_paid,
      due_amount = GREATEST(0, v_total_amount - v_total_paid),
      status = CASE WHEN v_total_paid >= v_total_amount THEN 'completed' ELSE status END
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;
