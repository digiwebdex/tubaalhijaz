-- First, convert due_amount from generated column to a regular column with a trigger
-- so we can enforce GREATEST(..., 0)
ALTER TABLE public.bookings DROP COLUMN due_amount;
ALTER TABLE public.bookings ADD COLUMN due_amount numeric
  GENERATED ALWAYS AS (GREATEST(total_amount - paid_amount, 0)) STORED;

-- Now fix the payment trigger to recalculate paid_amount from all completed payments
-- The old trigger/function were already dropped in the failed migration
-- Recreate them properly

CREATE OR REPLACE FUNCTION public.update_booking_paid_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_paid NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  -- Recalculate total paid from all completed payments for this booking
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM public.payments
  WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
    AND status = 'completed';

  -- Get booking total to cap paid_amount
  SELECT total_amount INTO v_total_amount
  FROM public.bookings
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  -- Cap paid_amount so it never exceeds total_amount
  v_total_paid := LEAST(v_total_paid, v_total_amount);

  -- Update the booking paid_amount (due_amount auto-calculates via generated column)
  UPDATE public.bookings
  SET paid_amount = v_total_paid,
      status = CASE
        WHEN v_total_paid >= v_total_amount THEN 'completed'
        ELSE status
      END
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fire on INSERT, UPDATE, or DELETE of payments
CREATE TRIGGER on_payment_change
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_booking_paid_amount();
