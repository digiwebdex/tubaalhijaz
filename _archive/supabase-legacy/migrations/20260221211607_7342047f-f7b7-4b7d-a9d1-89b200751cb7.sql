
-- Create notification logs table
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- booking_created, booking_completed, payment_received, payment_reminder, custom
  channel TEXT NOT NULL, -- email, sms, whatsapp
  recipient TEXT NOT NULL, -- email address or phone number
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, failed, pending
  error_detail TEXT,
  sent_by UUID, -- admin user who triggered it (null for auto)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage all notification logs
CREATE POLICY "Admins can manage notification logs"
ON public.notification_logs FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can view their own notification logs
CREATE POLICY "Users can view own notification logs"
ON public.notification_logs FOR SELECT
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_notification_logs_user ON public.notification_logs(user_id);
CREATE INDEX idx_notification_logs_booking ON public.notification_logs(booking_id);
CREATE INDEX idx_notification_logs_event ON public.notification_logs(event_type);
CREATE INDEX idx_notification_logs_created ON public.notification_logs(created_at DESC);
