
-- Trigger function: notify on booking created
CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    BEGIN
      PERFORM net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object(
          'type', 'booking_created',
          'channels', jsonb_build_array('email', 'sms'),
          'user_id', COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'),
          'booking_id', NEW.id
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_booking_created failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: notify on booking status updated
CREATE OR REPLACE FUNCTION public.notify_booking_status_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status <> 'completed' THEN
    BEGIN
      PERFORM net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object(
          'type', 'booking_status_updated',
          'channels', jsonb_build_array('email', 'sms'),
          'user_id', COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'),
          'booking_id', NEW.id,
          'new_status', NEW.status
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_booking_status_updated failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: notify on supplier payment
CREATE OR REPLACE FUNCTION public.notify_supplier_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supplier_name TEXT;
  v_booking_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT agent_name INTO v_supplier_name FROM public.supplier_agents WHERE id = NEW.supplier_agent_id;
    
    IF NEW.booking_id IS NOT NULL THEN
      SELECT user_id INTO v_booking_user_id FROM public.bookings WHERE id = NEW.booking_id;
    END IF;

    BEGIN
      PERFORM net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object(
          'type', 'supplier_payment_recorded',
          'channels', jsonb_build_array('email'),
          'user_id', COALESCE(NEW.recorded_by, v_booking_user_id, '00000000-0000-0000-0000-000000000000'),
          'booking_id', NEW.booking_id,
          'amount', NEW.amount,
          'supplier_name', COALESCE(v_supplier_name, 'Unknown')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_supplier_payment failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function: notify on commission payment
CREATE OR REPLACE FUNCTION public.notify_commission_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_moallem_name TEXT;
  v_booking_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_moallem_name FROM public.moallems WHERE id = NEW.moallem_id;
    
    IF NEW.booking_id IS NOT NULL THEN
      SELECT user_id INTO v_booking_user_id FROM public.bookings WHERE id = NEW.booking_id;
    END IF;

    BEGIN
      PERFORM net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object(
          'type', 'commission_paid',
          'channels', jsonb_build_array('email'),
          'user_id', COALESCE(NEW.recorded_by, v_booking_user_id, '00000000-0000-0000-0000-000000000000'),
          'booking_id', NEW.booking_id,
          'amount', NEW.amount,
          'moallem_name', COALESCE(v_moallem_name, 'Unknown')
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_commission_payment failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_notify_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_created();

CREATE TRIGGER trg_notify_booking_status_updated
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_updated();

CREATE TRIGGER trg_notify_supplier_payment
  AFTER INSERT ON public.supplier_agent_payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_supplier_payment();

CREATE TRIGGER trg_notify_commission_payment
  AFTER INSERT ON public.moallem_commission_payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_commission_payment();

-- Ensure existing trigger functions have actual triggers attached
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_payment_completed') THEN
    CREATE TRIGGER trg_notify_payment_completed
      AFTER INSERT OR UPDATE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.notify_payment_completed();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_booking_completed') THEN
    CREATE TRIGGER trg_notify_booking_completed
      AFTER UPDATE ON public.bookings
      FOR EACH ROW EXECUTE FUNCTION public.notify_booking_completed();
  END IF;
END;
$$;
