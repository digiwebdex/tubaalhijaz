
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

  -- Cap paid_amount: never exceed total, never go negative
  v_total_paid := GREATEST(0, LEAST(v_total_paid, v_total_amount));

  UPDATE public.bookings
  SET paid_amount = v_total_paid,
      status = CASE WHEN v_total_paid >= v_total_amount THEN 'completed' ELSE status END
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;
