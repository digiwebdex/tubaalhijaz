
-- Add expiry_date column to packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS expiry_date date DEFAULT NULL;

-- Function to auto-deactivate expired packages (called before SELECT or on any update)
CREATE OR REPLACE FUNCTION public.deactivate_expired_packages()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.packages
  SET is_active = false
  WHERE expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE
    AND is_active = true;
END;
$function$;

-- Also check on insert/update of packages
CREATE OR REPLACE FUNCTION public.check_package_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER check_package_expiry_on_upsert
  BEFORE INSERT OR UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_package_expiry();
