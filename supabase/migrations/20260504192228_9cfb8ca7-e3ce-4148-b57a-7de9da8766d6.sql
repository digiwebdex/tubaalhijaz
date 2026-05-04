
-- Transport services (catalog)
CREATE TABLE IF NOT EXISTS public.transport_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_type TEXT NOT NULL,
  route_from TEXT,
  route_to TEXT,
  capacity INTEGER NOT NULL DEFAULT 1,
  price_bdt NUMERIC NOT NULL DEFAULT 0,
  price_sar NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active transport services" ON public.transport_services FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage transport services" ON public.transport_services FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Transport bookings
CREATE TABLE IF NOT EXISTS public.transport_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID,
  user_id UUID,
  vehicle_type TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  pickup_datetime TIMESTAMPTZ,
  passengers INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage transport bookings" ON public.transport_bookings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users view own transport bookings" ON public.transport_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can create transport booking" ON public.transport_bookings FOR INSERT WITH CHECK (true);

-- Catering packages
CREATE TABLE IF NOT EXISTS public.catering_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  cuisine TEXT,
  price_per_meal NUMERIC NOT NULL DEFAULT 0,
  min_persons INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_on_website BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catering_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active catering packages" ON public.catering_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage catering packages" ON public.catering_packages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Catering orders
CREATE TABLE IF NOT EXISTS public.catering_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID,
  user_id UUID,
  package_id UUID REFERENCES public.catering_packages(id),
  persons INTEGER NOT NULL DEFAULT 1,
  days INTEGER NOT NULL DEFAULT 1,
  start_date DATE,
  total_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  delivery_address TEXT,
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catering_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage catering orders" ON public.catering_orders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users view own catering orders" ON public.catering_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can create catering order" ON public.catering_orders FOR INSERT WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER trg_transport_services_updated BEFORE UPDATE ON public.transport_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_transport_bookings_updated BEFORE UPDATE ON public.transport_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_catering_packages_updated BEFORE UPDATE ON public.catering_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_catering_orders_updated BEFORE UPDATE ON public.catering_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Transport
INSERT INTO public.transport_services (vehicle_type, route_from, route_to, capacity, price_sar, display_order) VALUES
  ('Sedan (1–3 pax)', 'Jeddah Airport', 'Makkah Hotel', 3, 250, 1),
  ('SUV (1–5 pax)', 'Jeddah Airport', 'Makkah Hotel', 5, 380, 2),
  ('Hiace (1–11 pax)', 'Makkah', 'Madinah', 11, 850, 3),
  ('Coaster (1–25 pax)', 'Ziyarah Tour', 'Makkah', 25, 1200, 4);

-- Seed Catering
INSERT INTO public.catering_packages (name, meal_type, cuisine, price_per_meal, display_order) VALUES
  ('Breakfast Plan', 'Breakfast', 'Arabic + Bangladeshi', 18, 1),
  ('Lunch Plan', 'Lunch', 'Bangladeshi Biryani', 28, 2),
  ('Dinner Plan', 'Dinner', 'Arabic Kabsa & Bangla', 28, 3);
