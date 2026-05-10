
ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_type_check;
ALTER TABLE public.packages
  ADD CONSTRAINT packages_type_check
  CHECK (type = ANY (ARRAY[
    'hajj'::text, 'umrah'::text, 'visa'::text, 'hotel'::text,
    'transport'::text, 'ziyara'::text, 'tour'::text, 'air_ticket'::text,
    'emergency'::text, 'other'::text
  ]));
