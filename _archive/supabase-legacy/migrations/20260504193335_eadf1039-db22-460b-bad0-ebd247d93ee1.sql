
CREATE SEQUENCE IF NOT EXISTS public.umrah_order_seq;

CREATE TABLE IF NOT EXISTS public.umrah_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id TEXT UNIQUE,
  customer_id UUID,
  user_id UUID,
  program_tier TEXT NOT NULL DEFAULT 'silver',
  travel_month TEXT,
  num_travelers INTEGER NOT NULL DEFAULT 1,
  room_type TEXT,
  makkah_nights INTEGER NOT NULL DEFAULT 0,
  madinah_nights INTEGER NOT NULL DEFAULT 0,
  include_visa BOOLEAN NOT NULL DEFAULT true,
  include_hotel BOOLEAN NOT NULL DEFAULT true,
  transport_vehicle TEXT,
  catering_package_id UUID REFERENCES public.catering_packages(id),
  include_ziyarat BOOLEAN NOT NULL DEFAULT false,
  include_reception BOOLEAN NOT NULL DEFAULT true,
  estimated_price_sar NUMERIC NOT NULL DEFAULT 0,
  estimated_price_bdt NUMERIC NOT NULL DEFAULT 0,
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  passport_ready BOOLEAN NOT NULL DEFAULT false,
  special_requests TEXT,
  assigned_to UUID,
  internal_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.umrah_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create umrah order" ON public.umrah_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage umrah orders" ON public.umrah_orders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view umrah orders" ON public.umrah_orders FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR has_role(auth.uid(), 'booking'::app_role)
  OR has_role(auth.uid(), 'viewer'::app_role)
);
CREATE POLICY "Users view own umrah orders" ON public.umrah_orders FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_umrah_order_tracking_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
    NEW.tracking_id := 'TT-UMR-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad(nextval('public.umrah_order_seq')::text, 4, '0');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER umrah_orders_set_tracking BEFORE INSERT OR UPDATE ON public.umrah_orders
FOR EACH ROW EXECUTE FUNCTION public.set_umrah_order_tracking_id();
