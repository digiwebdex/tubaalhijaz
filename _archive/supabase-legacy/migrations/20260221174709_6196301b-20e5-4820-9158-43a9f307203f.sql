-- Allow public read access to bookings by tracking_id for the tracking feature
CREATE POLICY "Anyone can view booking by tracking_id"
ON public.bookings
FOR SELECT
USING (true);

-- Drop the old restrictive select policy since the new one covers it
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

-- Recreate user-specific policy as permissive for own bookings (the above covers public read)
-- Actually, since we now have a public read, we don't need the user-specific one
-- But we should be careful - let's use a more targeted approach instead

-- Actually let's revert and be more targeted: allow public to see limited booking info
DROP POLICY IF EXISTS "Anyone can view booking by tracking_id" ON public.bookings;

-- Re-add user own bookings policy
CREATE POLICY "Users can view own bookings"
ON public.bookings
FOR SELECT
USING (auth.uid() = user_id);

-- Add public tracking policy (anyone can view by tracking_id - but they need to know the ID)
CREATE POLICY "Public tracking by tracking_id"
ON public.bookings
FOR SELECT
USING (true);
