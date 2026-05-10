ALTER TABLE public.transport_orders
  ADD COLUMN IF NOT EXISTS route_type text,
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS arrival_airport text,
  ADD COLUMN IF NOT EXISTS hotel_destination text,
  ADD COLUMN IF NOT EXISTS makkah_hotel_name text,
  ADD COLUMN IF NOT EXISTS madinah_hotel_name text;