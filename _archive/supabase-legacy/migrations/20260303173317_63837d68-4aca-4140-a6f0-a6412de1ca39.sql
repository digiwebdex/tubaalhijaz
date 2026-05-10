
-- Add new roles 'booking' and 'cms' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'booking';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cms';
