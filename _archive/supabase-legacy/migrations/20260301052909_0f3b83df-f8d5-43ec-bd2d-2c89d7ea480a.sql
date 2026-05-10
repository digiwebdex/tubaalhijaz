DROP TRIGGER IF EXISTS trg_payment_completed ON payments;
CREATE TRIGGER trg_payment_completed
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION on_payment_completed();

DROP TRIGGER IF EXISTS trg_notify_payment_completed ON payments;
CREATE TRIGGER trg_notify_payment_completed
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_completed();