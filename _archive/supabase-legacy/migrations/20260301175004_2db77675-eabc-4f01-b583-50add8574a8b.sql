
-- Clean up duplicate/legacy triggers (keep only the trg_ prefixed ones)
DROP TRIGGER IF EXISTS trg_booking_paid_amount ON public.payments;
DROP TRIGGER IF EXISTS trg_notify_payment ON public.payments;
DROP TRIGGER IF EXISTS trg_payment_completed ON public.payments;
DROP TRIGGER IF EXISTS trg_update_booking_paid ON public.payments;
DROP TRIGGER IF EXISTS trg_notify_booking ON public.bookings;
DROP TRIGGER IF EXISTS trg_updated_at_bookings ON public.bookings;
DROP TRIGGER IF EXISTS trg_updated_at_packages ON public.packages;
DROP TRIGGER IF EXISTS check_package_expiry_on_upsert ON public.packages;
DROP TRIGGER IF EXISTS trg_updated_at_hotels ON public.hotels;
DROP TRIGGER IF EXISTS trg_expense_changed ON public.expenses;
