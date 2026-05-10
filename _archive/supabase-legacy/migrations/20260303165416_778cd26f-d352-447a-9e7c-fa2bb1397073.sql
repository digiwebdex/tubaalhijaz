
-- Add booking_type and discount to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'individual';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;

-- Create booking_members table for family bookings
CREATE TABLE public.booking_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  passport_number text,
  package_id uuid REFERENCES public.packages(id),
  selling_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  final_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage booking members" ON public.booking_members FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own booking members" ON public.booking_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_members.booking_id AND bookings.user_id = auth.uid())
);
