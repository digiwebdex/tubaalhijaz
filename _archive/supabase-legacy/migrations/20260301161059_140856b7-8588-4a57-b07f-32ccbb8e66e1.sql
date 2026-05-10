
-- Trigger: When booking created/updated with moallem_id, update moallem totals
CREATE OR REPLACE FUNCTION public.update_moallem_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_amount NUMERIC;
  v_total_paid NUMERIC;
  v_hajji_count INTEGER;
  v_moallem_id UUID;
BEGIN
  -- Handle the moallem that needs updating
  v_moallem_id := COALESCE(NEW.moallem_id, OLD.moallem_id);
  
  IF v_moallem_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- If moallem changed on UPDATE, also update the old moallem
  IF TG_OP = 'UPDATE' AND OLD.moallem_id IS NOT NULL AND OLD.moallem_id IS DISTINCT FROM NEW.moallem_id THEN
    SELECT COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0), COALESCE(SUM(num_travelers), 0)
    INTO v_total_amount, v_total_paid, v_hajji_count
    FROM public.bookings WHERE moallem_id = OLD.moallem_id;

    UPDATE public.moallems SET
      total_due = GREATEST(0, v_total_amount - v_total_paid),
      updated_at = now()
    WHERE id = OLD.moallem_id;
  END IF;

  -- Update the current moallem
  SELECT COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0), COALESCE(SUM(num_travelers), 0)
  INTO v_total_amount, v_total_paid, v_hajji_count
  FROM public.bookings WHERE moallem_id = v_moallem_id;

  UPDATE public.moallems SET
    total_due = GREATEST(0, v_total_amount - v_total_paid),
    updated_at = now()
  WHERE id = v_moallem_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_moallem_on_booking
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_moallem_on_booking();

-- Trigger: When moallem_payment recorded, update moallem total_deposit
CREATE OR REPLACE FUNCTION public.update_moallem_on_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_deposit NUMERIC;
  v_total_amount NUMERIC;
  v_total_paid NUMERIC;
  v_moallem_id UUID;
BEGIN
  v_moallem_id := COALESCE(NEW.moallem_id, OLD.moallem_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposit
  FROM public.moallem_payments WHERE moallem_id = v_moallem_id;

  SELECT COALESCE(SUM(total_amount), 0), COALESCE(SUM(paid_amount), 0)
  INTO v_total_amount, v_total_paid
  FROM public.bookings WHERE moallem_id = v_moallem_id;

  UPDATE public.moallems SET
    total_deposit = v_total_deposit,
    total_due = GREATEST(0, v_total_amount - v_total_paid),
    updated_at = now()
  WHERE id = v_moallem_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_moallem_on_deposit
AFTER INSERT OR UPDATE OR DELETE ON public.moallem_payments
FOR EACH ROW EXECUTE FUNCTION public.update_moallem_on_deposit();
