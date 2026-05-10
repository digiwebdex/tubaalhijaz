ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 4.9,
  ADD COLUMN IF NOT EXISTS highlight_tag text;