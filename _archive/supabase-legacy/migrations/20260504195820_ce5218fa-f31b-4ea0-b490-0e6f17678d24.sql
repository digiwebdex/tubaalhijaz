
CREATE TABLE IF NOT EXISTS public.transport_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id text NOT NULL DEFAULT ('TT-TR-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6))),
  service_id uuid REFERENCES public.transport_services(id) ON DELETE SET NULL,
  vehicle_type text NOT NULL,
  route_from text,
  route_to text,
  pickup_date date,
  pickup_time text,
  passengers integer NOT NULL DEFAULT 1,
  guest_name text NOT NULL,
  guest_phone text NOT NULL,
  guest_email text,
  pickup_address text,
  dropoff_address text,
  notes text,
  total_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'pending',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create transport order" ON public.transport_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own transport orders" ON public.transport_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage transport orders" ON public.transport_orders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_transport_orders_updated BEFORE UPDATE ON public.transport_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
