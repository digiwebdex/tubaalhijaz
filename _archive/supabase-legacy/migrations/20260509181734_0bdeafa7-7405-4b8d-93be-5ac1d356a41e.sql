CREATE TABLE public.transport_voucher_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  agent_name text,
  agent_country text,
  umrah_company text,
  group_numbers text[] NOT NULL DEFAULT '{}',
  package_name text,
  travel_date date,
  hotels jsonb NOT NULL DEFAULT '[]'::jsonb,
  transport_type text,
  pilgrim_count integer,
  flights jsonb NOT NULL DEFAULT '[]'::jsonb,
  internal_movements jsonb NOT NULL DEFAULT '[]'::jsonb,
  supervisor_makkah_phone text,
  supervisor_madinah_phone text,
  ops_24h_phone text,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text,
  notes text,
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.transport_voucher_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit voucher orders"
ON public.transport_voucher_orders
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view voucher orders"
ON public.transport_voucher_orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update voucher orders"
ON public.transport_voucher_orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete voucher orders"
ON public.transport_voucher_orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_transport_voucher_orders_updated_at
BEFORE UPDATE ON public.transport_voucher_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();