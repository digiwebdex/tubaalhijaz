
-- Add status column (replacing is_active concept) and show_on_website to packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS show_on_website boolean NOT NULL DEFAULT true;

-- Migrate existing is_active data to status
UPDATE public.packages SET status = CASE WHEN is_active = true THEN 'active' ELSE 'inactive' END WHERE status = 'active';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_packages_status ON public.packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_show_on_website ON public.packages(show_on_website);

-- Update the deactivate_expired_packages function to use status column
CREATE OR REPLACE FUNCTION public.deactivate_expired_packages()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.packages
  SET status = 'inactive', is_active = false
  WHERE expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE
    AND status = 'active';
END;
$$;

-- Update the check_package_expiry trigger function
CREATE OR REPLACE FUNCTION public.check_package_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
    NEW.status := 'inactive';
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;
