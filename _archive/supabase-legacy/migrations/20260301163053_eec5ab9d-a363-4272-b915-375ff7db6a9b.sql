
ALTER TABLE public.bookings
  ADD COLUMN supplier_agent_id UUID REFERENCES public.supplier_agents(id),
  ADD COLUMN cost_price_per_person NUMERIC DEFAULT 0,
  ADD COLUMN total_cost NUMERIC DEFAULT 0;
