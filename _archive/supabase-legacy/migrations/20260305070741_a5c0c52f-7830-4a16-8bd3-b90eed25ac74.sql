
ALTER TABLE public.moallems
ADD COLUMN contracted_hajji integer NOT NULL DEFAULT 0,
ADD COLUMN contracted_amount numeric NOT NULL DEFAULT 0;
