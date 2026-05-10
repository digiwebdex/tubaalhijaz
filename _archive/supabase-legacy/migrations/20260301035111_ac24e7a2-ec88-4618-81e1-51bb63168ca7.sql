
-- Attach payment completion trigger (income transaction + booking update)
CREATE TRIGGER trg_payment_completed
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_payment_completed();

-- Attach booking paid_amount recalculation on payment changes
CREATE TRIGGER trg_update_booking_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_paid_amount();

-- Attach expense accounting trigger
CREATE TRIGGER trg_expense_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.on_expense_changed();

-- Attach updated_at triggers
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Attach booking completed notification trigger
CREATE TRIGGER trg_notify_booking_completed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_completed();
