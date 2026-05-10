
-- Prevent deletion of the primary admin role
CREATE OR REPLACE FUNCTION public.protect_admin_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Protect the primary admin account (admin@rahekaba.com)
  IF OLD.user_id = '9c56194a-b0f9-4878-ac57-e97371acd199' AND OLD.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot delete the primary admin role';
  END IF;
  RETURN OLD;
END;
$function$;

CREATE TRIGGER prevent_admin_role_deletion
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_role();

-- Also prevent updating the primary admin's role away from admin
CREATE OR REPLACE FUNCTION public.protect_admin_role_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.user_id = '9c56194a-b0f9-4878-ac57-e97371acd199' AND OLD.role = 'admin' AND NEW.role <> 'admin' THEN
    RAISE EXCEPTION 'Cannot change the primary admin role';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER prevent_admin_role_update
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_role_update();
