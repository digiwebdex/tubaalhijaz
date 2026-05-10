
-- Fix bookings RLS: change from RESTRICTIVE to PERMISSIVE so admin can create bookings for any user
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admins can manage all bookings" ON public.bookings FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);

-- Also fix payments RLS so admin can insert payments for any user
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;

CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);

-- Fix booking_members RLS
DROP POLICY IF EXISTS "Admins can manage booking members" ON public.booking_members;
DROP POLICY IF EXISTS "Users can view own booking members" ON public.booking_members;

CREATE POLICY "Admins can manage booking members" ON public.booking_members FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own booking members" ON public.booking_members FOR SELECT USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_members.booking_id AND bookings.user_id = auth.uid()));
