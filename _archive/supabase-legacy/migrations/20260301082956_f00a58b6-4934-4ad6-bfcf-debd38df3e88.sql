
-- Drop FK constraint on bookings.user_id so admin-created bookings can link to profile-only customers
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
