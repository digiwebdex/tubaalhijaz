
-- Trigger function to send SMS/email notification on payment completion
CREATE OR REPLACE FUNCTION public.notify_payment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
      ),
      body := jsonb_build_object(
        'type', 'payment_received',
        'channels', jsonb_build_array('email', 'sms'),
        'user_id', COALESCE(NEW.user_id, (SELECT user_id FROM public.bookings WHERE id = NEW.booking_id)),
        'booking_id', NEW.booking_id,
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'installment_number', NEW.installment_number
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trg_notify_payment_completed
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_completed();
