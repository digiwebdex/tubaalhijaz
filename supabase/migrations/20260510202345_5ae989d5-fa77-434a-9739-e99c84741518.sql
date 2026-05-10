-- Expand role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='super_admin' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='operations_manager' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'operations_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='visa_officer' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'visa_officer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='transport_manager' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'transport_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='catering_manager' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'catering_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='finance_manager' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'finance_manager';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='hotel_coordinator' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'hotel_coordinator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='airport_coordinator' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'airport_coordinator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='driver' AND enumtypid='public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'driver';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.permissions (
  key TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage permissions" ON public.permissions;
CREATE POLICY "Admins manage permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);
CREATE INDEX IF NOT EXISTS idx_role_perm_role ON public.role_permissions(role);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage role_permissions" ON public.role_permissions;
CREATE POLICY "Admins manage role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  scope TEXT NOT NULL DEFAULT 'all',
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_key)
);
ALTER TABLE public.permission_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage permission_overrides" ON public.permission_overrides;
CREATE POLICY "Admins manage permission_overrides" ON public.permission_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID,
  requested_by_email TEXT,
  reviewed_by UUID,
  reviewed_by_email TEXT,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON public.approval_requests(type);
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage approval_requests" ON public.approval_requests;
CREATE POLICY "Admins manage approval_requests" ON public.approval_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- Seed permissions catalog
INSERT INTO public.permissions (key, module, label, description) VALUES
  ('bookings.view','bookings','View bookings','Read access to bookings'),
  ('bookings.create','bookings','Create bookings',NULL),
  ('bookings.edit','bookings','Edit bookings',NULL),
  ('bookings.delete','bookings','Delete bookings',NULL),
  ('bookings.approve','bookings','Approve bookings',NULL),
  ('bookings.export','bookings','Export bookings',NULL),
  ('payments.view','finance','View payments',NULL),
  ('payments.create','finance','Record payments',NULL),
  ('payments.edit','finance','Edit payments',NULL),
  ('payments.refund','finance','Issue refunds',NULL),
  ('finance.full','finance','Full financial access','Accounting, ledgers, P&L'),
  ('visa.view','visa','View visa pipeline',NULL),
  ('visa.update','visa','Update visa status',NULL),
  ('visa.approve','visa','Approve / reject visa',NULL),
  ('transport.view','transport','View transport',NULL),
  ('transport.assign','transport','Assign drivers',NULL),
  ('catering.view','catering','View catering',NULL),
  ('catering.manage','catering','Manage catering',NULL),
  ('hotel.view','hotel','View hotels',NULL),
  ('hotel.manage','hotel','Manage hotels',NULL),
  ('documents.view','documents','View documents',NULL),
  ('documents.review','documents','Review documents',NULL),
  ('messaging.send','messaging','Send messages',NULL),
  ('messaging.templates','messaging','Manage templates',NULL),
  ('qr.verify','security','Verify QR codes',NULL),
  ('users.manage','security','Manage users',NULL),
  ('roles.manage','security','Manage roles',NULL),
  ('audit.view','security','View audit logs',NULL),
  ('approvals.review','security','Review approvals',NULL),
  ('reports.view','reports','View reports',NULL),
  ('reports.export','reports','Export reports',NULL)
ON CONFLICT (key) DO NOTHING;
