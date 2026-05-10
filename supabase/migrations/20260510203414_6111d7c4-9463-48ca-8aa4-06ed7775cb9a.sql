
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='airport_coordinator' AND enumtypid='app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'airport_coordinator';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.live_vehicle_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID,
  voucher_id UUID,
  driver_user_id UUID,
  driver_name TEXT,
  vehicle_label TEXT,
  lat NUMERIC(10,6) NOT NULL,
  lng NUMERIC(10,6) NOT NULL,
  speed_kmh NUMERIC(6,2),
  heading NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'on_route',
  eta_minutes INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lvt_movement ON public.live_vehicle_tracking(movement_id);
CREATE INDEX IF NOT EXISTS idx_lvt_driver ON public.live_vehicle_tracking(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_lvt_recorded ON public.live_vehicle_tracking(recorded_at DESC);
ALTER TABLE public.live_vehicle_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lvt_admin_all" ON public.live_vehicle_tracking FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'operations_manager') OR public.has_role(auth.uid(), 'transport_manager') OR
  public.has_role(auth.uid(), 'airport_coordinator')
) WITH CHECK (true);
CREATE POLICY "lvt_driver_self" ON public.live_vehicle_tracking FOR ALL TO authenticated
USING (driver_user_id = auth.uid()) WITH CHECK (driver_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.ops_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  body TEXT,
  related_type TEXT,
  related_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ops_alerts_status ON public.ops_alerts(status, created_at DESC);
ALTER TABLE public.ops_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ops_alerts_staff" ON public.ops_alerts FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'operations_manager') OR public.has_role(auth.uid(), 'transport_manager') OR
  public.has_role(auth.uid(), 'airport_coordinator') OR public.has_role(auth.uid(), 'finance_manager') OR
  public.has_role(auth.uid(), 'visa_officer')
) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.airport_arrivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  voucher_id UUID,
  direction TEXT NOT NULL DEFAULT 'arrival',
  airport_code TEXT NOT NULL,
  airport_name TEXT,
  airline TEXT,
  flight_number TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  actual_at TIMESTAMPTZ,
  pilgrim_count INTEGER NOT NULL DEFAULT 1,
  assigned_driver_id UUID,
  assigned_driver_name TEXT,
  vehicle_label TEXT,
  pickup_status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_airport_arrivals_sched ON public.airport_arrivals(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_airport_arrivals_status ON public.airport_arrivals(pickup_status);
ALTER TABLE public.airport_arrivals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arrivals_staff" ON public.airport_arrivals FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'operations_manager') OR public.has_role(auth.uid(), 'transport_manager') OR
  public.has_role(auth.uid(), 'airport_coordinator')
) WITH CHECK (true);
CREATE POLICY "arrivals_driver_self" ON public.airport_arrivals FOR ALL TO authenticated
USING (assigned_driver_id = auth.uid()) WITH CHECK (assigned_driver_id = auth.uid());

CREATE TRIGGER trg_airport_arrivals_updated
BEFORE UPDATE ON public.airport_arrivals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
