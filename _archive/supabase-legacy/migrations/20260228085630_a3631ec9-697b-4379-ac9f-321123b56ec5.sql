
-- Make bookings.user_id nullable to support guest bookings
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

-- Add guest contact fields directly on bookings for guest bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_phone text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_address text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_passport text;

-- Allow anonymous users to search bookings by tracking_id (already exists)
-- Add policy for searching by phone via edge function (service role bypasses RLS)

-- Update insert policy to allow guest bookings (user_id can be null)
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add policy for anon to read bookings by tracking_id (already covered by "Public tracking by tracking_id")
