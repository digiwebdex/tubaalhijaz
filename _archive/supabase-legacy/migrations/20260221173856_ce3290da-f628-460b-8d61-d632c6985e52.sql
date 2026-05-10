
-- Hotels table
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Makkah',
  description TEXT,
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5),
  distance_to_haram TEXT,
  amenities JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  gallery JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active hotels" ON public.hotels FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage hotels" ON public.hotels FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hotel rooms
CREATE TABLE public.hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 2,
  price_per_night NUMERIC(10,2) NOT NULL,
  amenities JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view available rooms" ON public.hotel_rooms FOR SELECT USING (is_available = true);
CREATE POLICY "Admins can manage rooms" ON public.hotel_rooms FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Hotel bookings
CREATE TABLE public.hotel_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id),
  room_id UUID NOT NULL REFERENCES public.hotel_rooms(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own hotel bookings" ON public.hotel_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create hotel bookings" ON public.hotel_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage hotel bookings" ON public.hotel_bookings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_hotel_bookings_updated_at BEFORE UPDATE ON public.hotel_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
