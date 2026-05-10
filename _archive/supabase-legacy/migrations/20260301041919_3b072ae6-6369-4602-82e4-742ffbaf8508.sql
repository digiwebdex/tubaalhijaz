
-- Remove pre-existing duplicate triggers (keep only trg_ prefixed ones)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_packages_updated_at ON public.packages;
DROP TRIGGER IF EXISTS on_booking_completed ON public.bookings;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS update_hotels_updated_at ON public.hotels;
DROP TRIGGER IF EXISTS trg_on_expense_changed ON public.expenses;
