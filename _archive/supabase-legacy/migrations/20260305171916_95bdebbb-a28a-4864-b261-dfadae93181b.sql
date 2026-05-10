
ALTER TABLE public.supplier_agents
  ADD COLUMN contract_date date DEFAULT NULL,
  ADD COLUMN contracted_hajji integer NOT NULL DEFAULT 0,
  ADD COLUMN contracted_amount numeric NOT NULL DEFAULT 0;
