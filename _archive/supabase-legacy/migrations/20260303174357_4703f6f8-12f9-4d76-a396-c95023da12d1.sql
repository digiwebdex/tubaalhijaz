
-- Drop all existing triggers first to avoid conflicts
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trigger_name, r.event_object_table);
  END LOOP;
END$$;

-- Also drop auth schema trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ══════════════════════════════════════════════════
-- RECREATE ALL TRIGGERS
-- ══════════════════════════════════════════════════

-- Auth user → profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Booking profit calculation (BEFORE INSERT/UPDATE)
CREATE TRIGGER trg_calculate_booking_profit
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_booking_profit();

-- Updated_at on bookings
CREATE TRIGGER trg_update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Booking created → notification
CREATE TRIGGER trg_notify_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_created();

-- Booking status updated → notification
CREATE TRIGGER trg_notify_booking_status_updated
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_status_updated();

-- Booking completed → notification
CREATE TRIGGER trg_notify_booking_completed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_completed();

-- Moallem booking sync
CREATE TRIGGER trg_update_moallem_on_booking
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_moallem_on_booking();

-- Payment → update booking paid_amount
CREATE TRIGGER trg_update_booking_paid_amount
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_paid_amount();

-- Payment completed → income + wallet + financial_summary
CREATE TRIGGER trg_on_payment_completed
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_payment_completed();

-- Payment completed → notification
CREATE TRIGGER trg_notify_payment_completed
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_completed();

-- Moallem payment → wallet handling (BEFORE)
CREATE TRIGGER trg_on_moallem_payment_wallet
  BEFORE INSERT OR UPDATE OR DELETE ON public.moallem_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_moallem_payment_wallet();

-- Moallem payment → deposit + due recalc
CREATE TRIGGER trg_update_moallem_on_deposit
  AFTER INSERT OR UPDATE OR DELETE ON public.moallem_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_moallem_on_deposit();

-- Moallem payment → income transaction + financial_summary
CREATE TRIGGER trg_on_moallem_payment_income
  AFTER INSERT OR UPDATE OR DELETE ON public.moallem_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_moallem_payment_income();

-- Moallem payment → booking paid_by_moallem sync
CREATE TRIGGER trg_update_booking_moallem_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.moallem_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_moallem_paid();

-- Supplier payment → expense + wallet + financial_summary
CREATE TRIGGER trg_on_supplier_payment_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_agent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_supplier_payment_changed();

-- Supplier payment → booking paid_to_supplier sync
CREATE TRIGGER trg_update_booking_supplier_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_agent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_supplier_paid();

-- Supplier payment → notification
CREATE TRIGGER trg_notify_supplier_payment
  AFTER INSERT ON public.supplier_agent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_supplier_payment();

-- Commission payment → expense + wallet + financial_summary
CREATE TRIGGER trg_on_commission_payment_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.moallem_commission_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_commission_payment_changed();

-- Commission payment → booking commission_paid sync
CREATE TRIGGER trg_update_booking_commission_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.moallem_commission_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_commission_paid();

-- Commission payment → notification
CREATE TRIGGER trg_notify_commission_payment
  AFTER INSERT ON public.moallem_commission_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_commission_payment();

-- Expense → wallet + financial_summary
CREATE TRIGGER trg_on_expense_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.on_expense_changed();

-- Package expiry check
CREATE TRIGGER trg_check_package_expiry
  BEFORE INSERT OR UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_package_expiry();

-- Updated_at triggers
CREATE TRIGGER trg_update_hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_update_moallems_updated_at
  BEFORE UPDATE ON public.moallems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_update_supplier_agents_updated_at
  BEFORE UPDATE ON public.supplier_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Admin role protection
CREATE TRIGGER trg_protect_admin_role
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_role();

CREATE TRIGGER trg_protect_admin_role_update
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_role_update();
