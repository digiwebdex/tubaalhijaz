-- ============================================================
-- TICKET BOOKINGS TABLE
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.ticket_invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.visa_invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.refund_invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.settlement_no_seq START 1;

CREATE OR REPLACE FUNCTION public.gen_ticket_invoice_no()
RETURNS TEXT LANGUAGE sql AS $$
  SELECT 'TKT' || to_char(CURRENT_DATE, 'YYYY') || lpad(nextval('public.ticket_invoice_seq')::text, 5, '0')
$$;

CREATE OR REPLACE FUNCTION public.gen_visa_invoice_no()
RETURNS TEXT LANGUAGE sql AS $$
  SELECT 'VS' || to_char(CURRENT_DATE, 'YYYY') || lpad(nextval('public.visa_invoice_seq')::text, 5, '0')
$$;

CREATE OR REPLACE FUNCTION public.gen_refund_invoice_no()
RETURNS TEXT LANGUAGE sql AS $$
  SELECT 'RFN' || to_char(CURRENT_DATE, 'YYYY') || lpad(nextval('public.refund_invoice_seq')::text, 5, '0')
$$;

CREATE OR REPLACE FUNCTION public.gen_settlement_no()
RETURNS TEXT LANGUAGE sql AS $$
  SELECT 'STM' || to_char(CURRENT_DATE, 'YYYY') || lpad(nextval('public.settlement_no_seq')::text, 7, '0')
$$;

-- ============================================================
-- TICKET BOOKINGS
-- ============================================================
CREATE TABLE public.ticket_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE DEFAULT public.gen_ticket_invoice_no(),
  staff_name TEXT,
  passenger_name TEXT NOT NULL,
  booking_ref TEXT,
  vendor_name TEXT,
  vendor_id UUID REFERENCES public.supplier_agents(id) ON DELETE SET NULL,
  billing_name TEXT,
  client_reference TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  terms_of_charge TEXT NOT NULL DEFAULT 'newly_issue',
  customer_billing_amount NUMERIC NOT NULL DEFAULT 0,
  our_cost NUMERIC NOT NULL DEFAULT 0,
  received_amount NUMERIC NOT NULL DEFAULT 0,
  customer_due NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'due',
  departure_date DATE,
  arrival_date DATE,
  route TEXT,
  expected_collection_date DATE,
  remarks TEXT,
  bill_correction_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_bookings_invoice ON public.ticket_bookings(invoice_no);
CREATE INDEX idx_ticket_bookings_status ON public.ticket_bookings(payment_status, status);
CREATE INDEX idx_ticket_bookings_collection ON public.ticket_bookings(expected_collection_date) WHERE payment_status <> 'paid';
CREATE INDEX idx_ticket_bookings_vendor ON public.ticket_bookings(vendor_id);

ALTER TABLE public.ticket_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ticket bookings" ON public.ticket_bookings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view ticket bookings" ON public.ticket_bookings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'viewer'::app_role));

-- ============================================================
-- VISA APPLICATIONS
-- ============================================================
CREATE TABLE public.visa_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE DEFAULT public.gen_visa_invoice_no(),
  staff_name TEXT,
  applicant_name TEXT NOT NULL,
  passport_number TEXT,
  country_name TEXT NOT NULL,
  vendor_name TEXT,
  vendor_id UUID REFERENCES public.supplier_agents(id) ON DELETE SET NULL,
  billing_name TEXT,
  client_reference TEXT,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  billing_amount NUMERIC NOT NULL DEFAULT 0,
  our_cost NUMERIC NOT NULL DEFAULT 0,
  received_amount NUMERIC NOT NULL DEFAULT 0,
  customer_due NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  visa_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'due',
  submission_date DATE,
  vendor_delivery_date DATE,
  client_delivery_date DATE,
  expected_collection_date DATE,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visa_applications_invoice ON public.visa_applications(invoice_no);
CREATE INDEX idx_visa_applications_status ON public.visa_applications(visa_status, payment_status, status);

ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage visa applications" ON public.visa_applications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view visa applications" ON public.visa_applications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'viewer'::app_role));

-- ============================================================
-- TICKET REFUNDS
-- ============================================================
CREATE TABLE public.ticket_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE DEFAULT public.gen_refund_invoice_no(),
  ticket_booking_id UUID REFERENCES public.ticket_bookings(id) ON DELETE SET NULL,
  staff_name TEXT,
  passenger_name TEXT NOT NULL,
  booking_ref TEXT,
  vendor_name TEXT,
  vendor_id UUID REFERENCES public.supplier_agents(id) ON DELETE SET NULL,
  billing_name TEXT,
  client_reference TEXT,
  refund_date DATE NOT NULL DEFAULT CURRENT_DATE,
  terms_of_charge TEXT NOT NULL DEFAULT 'refund_charge',
  billing_amount_was NUMERIC NOT NULL DEFAULT 0,
  customer_refund_charge NUMERIC NOT NULL DEFAULT 0,
  our_refund_charge NUMERIC NOT NULL DEFAULT 0,
  refund_back_from_vendor NUMERIC NOT NULL DEFAULT 0,
  credit_amount_to_client NUMERIC NOT NULL DEFAULT 0,
  ticket_costing_was NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  bill_received NUMERIC NOT NULL DEFAULT 0,
  due NUMERIC NOT NULL DEFAULT 0,
  credit_status TEXT NOT NULL DEFAULT 'pending',
  route TEXT,
  remarks TEXT,
  wallet_account_id UUID REFERENCES public.accounts(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_refunds_invoice ON public.ticket_refunds(invoice_no);
CREATE INDEX idx_ticket_refunds_booking ON public.ticket_refunds(ticket_booking_id);

ALTER TABLE public.ticket_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ticket refunds" ON public.ticket_refunds FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view ticket refunds" ON public.ticket_refunds FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'viewer'::app_role));

-- ============================================================
-- SETTLEMENTS (Customer Payments to us — supports bulk)
-- ============================================================
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_no TEXT NOT NULL UNIQUE DEFAULT public.gen_settlement_no(),
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payer_name TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  wallet_account_id UUID REFERENCES public.accounts(id),
  notes TEXT,
  receipt_file_path TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlements_no ON public.settlements(settlement_no);
CREATE INDEX idx_settlements_date ON public.settlements(settlement_date);

CREATE TABLE public.settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,  -- 'ticket' | 'visa' | 'refund'
  source_id UUID NOT NULL,
  invoice_no TEXT,
  amount_applied NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlement_items_settlement ON public.settlement_items(settlement_id);
CREATE INDEX idx_settlement_items_source ON public.settlement_items(source_type, source_id);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage settlements" ON public.settlements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view settlements" ON public.settlements FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'viewer'::app_role));

CREATE POLICY "Admins manage settlement items" ON public.settlement_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view settlement items" ON public.settlement_items FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role) OR has_role(auth.uid(), 'staff'::app_role)
    OR has_role(auth.uid(), 'viewer'::app_role));

-- ============================================================
-- AUTO-CALC PROFIT + DUE on ticket_bookings
-- ============================================================
CREATE OR REPLACE FUNCTION public.calc_ticket_booking_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.profit := COALESCE(NEW.customer_billing_amount, 0) - COALESCE(NEW.our_cost, 0);
  NEW.customer_due := GREATEST(0, COALESCE(NEW.customer_billing_amount, 0) - COALESCE(NEW.received_amount, 0));
  IF NEW.received_amount <= 0 THEN
    NEW.payment_status := 'due';
  ELSIF NEW.received_amount >= NEW.customer_billing_amount THEN
    NEW.payment_status := 'paid';
  ELSE
    NEW.payment_status := 'partial';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calc_ticket_booking
BEFORE INSERT OR UPDATE ON public.ticket_bookings
FOR EACH ROW EXECUTE FUNCTION public.calc_ticket_booking_fields();

-- ============================================================
-- AUTO-CALC PROFIT + DUE on visa_applications
-- ============================================================
CREATE OR REPLACE FUNCTION public.calc_visa_application_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.profit := COALESCE(NEW.billing_amount, 0) - COALESCE(NEW.our_cost, 0);
  NEW.customer_due := GREATEST(0, COALESCE(NEW.billing_amount, 0) - COALESCE(NEW.received_amount, 0));
  IF NEW.received_amount <= 0 THEN
    NEW.payment_status := 'due';
  ELSIF NEW.received_amount >= NEW.billing_amount THEN
    NEW.payment_status := 'paid';
  ELSE
    NEW.payment_status := 'partial';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calc_visa_application
BEFORE INSERT OR UPDATE ON public.visa_applications
FOR EACH ROW EXECUTE FUNCTION public.calc_visa_application_fields();

-- ============================================================
-- AUTO-CALC fields on ticket_refunds
-- ============================================================
CREATE OR REPLACE FUNCTION public.calc_ticket_refund_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.profit := COALESCE(NEW.customer_refund_charge, 0) - COALESCE(NEW.our_refund_charge, 0);
  NEW.due := GREATEST(0, COALESCE(NEW.customer_refund_charge, 0) - COALESCE(NEW.bill_received, 0));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calc_ticket_refund
BEFORE INSERT OR UPDATE ON public.ticket_refunds
FOR EACH ROW EXECUTE FUNCTION public.calc_ticket_refund_fields();

-- ============================================================
-- SETTLEMENT APPLY: when settlement_items are inserted/deleted,
-- recalc the source's received_amount and propagate to status.
-- Also handle wallet credit on settlement insert/delete.
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_source_received(p_source_type TEXT, p_source_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount_applied), 0) INTO v_total
  FROM public.settlement_items
  WHERE source_type = p_source_type AND source_id = p_source_id;

  IF p_source_type = 'ticket' THEN
    UPDATE public.ticket_bookings SET received_amount = v_total WHERE id = p_source_id;
  ELSIF p_source_type = 'visa' THEN
    UPDATE public.visa_applications SET received_amount = v_total WHERE id = p_source_id;
  ELSIF p_source_type = 'refund' THEN
    UPDATE public.ticket_refunds SET bill_received = v_total WHERE id = p_source_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_settlement_item_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalc_source_received(NEW.source_type, NEW.source_id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.source_type <> NEW.source_type OR OLD.source_id <> NEW.source_id THEN
      PERFORM public.recalc_source_received(OLD.source_type, OLD.source_id);
    END IF;
    PERFORM public.recalc_source_received(NEW.source_type, NEW.source_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_source_received(OLD.source_type, OLD.source_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_settlement_item_changed
AFTER INSERT OR UPDATE OR DELETE ON public.settlement_items
FOR EACH ROW EXECUTE FUNCTION public.on_settlement_item_changed();

-- ============================================================
-- SETTLEMENT WALLET + LEDGER on settlement insert/delete
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_settlement_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
    IF NEW.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + NEW.total_amount, updated_at = now()
      WHERE id = NEW.wallet_account_id;
    END IF;
    INSERT INTO public.transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, payment_method, reference)
    VALUES ('income', 'travel_settlement', NEW.total_amount, NEW.total_amount, 0, 'settlement', NEW.id,
      COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.settlement_date, 'Settlement ' || NEW.settlement_no, NEW.payment_method, NEW.id::text);
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'completed' THEN
    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = GREATEST(0, balance - OLD.total_amount), updated_at = now()
      WHERE id = OLD.wallet_account_id;
    END IF;
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND source_type = 'settlement';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_on_settlement_changed
AFTER INSERT OR DELETE ON public.settlements
FOR EACH ROW EXECUTE FUNCTION public.on_settlement_changed();

-- ============================================================
-- TICKET REFUND WALLET + LEDGER (refund outflow)
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_ticket_refund_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' AND NEW.credit_amount_to_client > 0 THEN
    IF NEW.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = GREATEST(0, balance - NEW.credit_amount_to_client), updated_at = now()
      WHERE id = NEW.wallet_account_id;
    END IF;
    INSERT INTO public.transactions (type, category, amount, debit, credit, source_type, source_id, user_id, date, note, reference)
    VALUES ('expense', 'ticket_refund', NEW.credit_amount_to_client, 0, NEW.credit_amount_to_client,
      'ticket_refund', NEW.id,
      COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NEW.refund_date, 'Refund ' || NEW.invoice_no, NEW.id::text);
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' AND OLD.credit_amount_to_client > 0 THEN
    IF OLD.wallet_account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + OLD.credit_amount_to_client, updated_at = now()
      WHERE id = OLD.wallet_account_id;
    END IF;
    DELETE FROM public.transactions WHERE reference = OLD.id::text AND source_type = 'ticket_refund';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_on_ticket_refund_changed
AFTER INSERT OR DELETE ON public.ticket_refunds
FOR EACH ROW EXECUTE FUNCTION public.on_ticket_refund_changed();