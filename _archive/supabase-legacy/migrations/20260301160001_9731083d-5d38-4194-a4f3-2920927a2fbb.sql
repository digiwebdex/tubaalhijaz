
ALTER TABLE public.bookings ADD COLUMN moallem_id uuid REFERENCES public.moallems(id) ON DELETE SET NULL DEFAULT NULL;
