CREATE TABLE IF NOT EXISTS qr_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL,
  related_type TEXT NOT NULL,
  related_id UUID NOT NULL,
  tracking_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  scan_count INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_related ON qr_verifications(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_qr_verifications_tracking ON qr_verifications(tracking_id);

CREATE TABLE IF NOT EXISTS public_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id UUID REFERENCES qr_verifications(id) ON DELETE SET NULL,
  tracking_id TEXT,
  document_type TEXT,
  scan_result TEXT NOT NULL DEFAULT 'verified',
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_public_tracking_logs_qr ON public_tracking_logs(qr_id);
CREATE INDEX IF NOT EXISTS idx_public_tracking_logs_scanned ON public_tracking_logs(scanned_at DESC);

ALTER TABLE booking_documents ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE booking_documents ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE booking_documents ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE booking_documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE qr_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_tracking_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_verifications_public_read" ON qr_verifications FOR SELECT USING (true);
CREATE POLICY "qr_verifications_admin_all" ON qr_verifications FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public_tracking_logs_admin_read" ON public_tracking_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "public_tracking_logs_public_insert" ON public_tracking_logs FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.auto_create_booking_qr()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(12), 'hex');
  INSERT INTO qr_verifications (token, document_type, related_type, related_id, tracking_id, created_by)
  VALUES (v_token, 'booking', 'booking', NEW.id, NEW.tracking_id, NEW.user_id)
  ON CONFLICT (token) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_booking_qr ON public.bookings;
CREATE TRIGGER trg_auto_create_booking_qr
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.auto_create_booking_qr();