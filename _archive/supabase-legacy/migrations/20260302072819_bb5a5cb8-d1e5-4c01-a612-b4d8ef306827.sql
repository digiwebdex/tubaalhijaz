
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  event_label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed default triggers
INSERT INTO public.notification_settings (event_key, event_label, enabled, email_enabled, sms_enabled) VALUES
  ('booking_created', 'Booking Created', true, true, true),
  ('payment_received', 'Payment Received', true, true, true),
  ('booking_status_updated', 'Booking Status Updated', true, true, true),
  ('booking_completed', 'Booking Completed', true, true, true),
  ('supplier_payment_recorded', 'Supplier Payment Recorded', true, true, false),
  ('commission_paid', 'Commission Paid', true, true, false),
  ('daily_due_reminder', 'Daily Due Reminder (Cron)', true, true, true);

-- RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification settings"
  ON public.notification_settings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can view notification settings"
  ON public.notification_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
