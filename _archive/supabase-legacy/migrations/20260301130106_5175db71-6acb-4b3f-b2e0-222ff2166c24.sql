
-- Drop and recreate all triggers to ensure they're all present

DROP TRIGGER IF EXISTS trg_update_booking_paid ON public.payments;
DROP TRIGGER IF EXISTS trg_on_payment_completed ON public.payments;
DROP TRIGGER IF EXISTS trg_notify_payment_completed ON public.payments;
DROP TRIGGER IF EXISTS trg_notify_booking_completed ON public.bookings;
DROP TRIGGER IF EXISTS trg_on_expense_changed ON public.expenses;
DROP TRIGGER IF EXISTS trg_check_package_expiry ON public.packages;
DROP TRIGGER IF EXISTS trg_updated_at_bookings ON public.bookings;
DROP TRIGGER IF EXISTS trg_updated_at_hotels ON public.hotels;
DROP TRIGGER IF EXISTS trg_updated_at_hotel_bookings ON public.hotel_bookings;
DROP TRIGGER IF EXISTS trg_protect_admin_role ON public.user_roles;
DROP TRIGGER IF EXISTS trg_protect_admin_role_update ON public.user_roles;

CREATE TRIGGER trg_update_booking_paid
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_booking_paid_amount();

CREATE TRIGGER trg_on_payment_completed
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.on_payment_completed();

CREATE TRIGGER trg_notify_payment_completed
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_completed();

CREATE TRIGGER trg_notify_booking_completed
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_completed();

CREATE TRIGGER trg_on_expense_changed
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.on_expense_changed();

CREATE TRIGGER trg_check_package_expiry
BEFORE INSERT OR UPDATE ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.check_package_expiry();

CREATE TRIGGER trg_updated_at_bookings
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_hotels
BEFORE UPDATE ON public.hotels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_updated_at_hotel_bookings
BEFORE UPDATE ON public.hotel_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_protect_admin_role
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_role();

CREATE TRIGGER trg_protect_admin_role_update
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_admin_role_update();
