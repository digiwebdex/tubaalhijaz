
-- Company signature/stamp settings table
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage company settings"
  ON public.company_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read (needed for PDF generation)
CREATE POLICY "Authenticated users can view company settings"
  ON public.company_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert default signature settings
INSERT INTO public.company_settings (setting_key, setting_value)
VALUES ('signature', '{"authorized_name": "", "designation": "", "signature_url": "", "stamp_url": ""}'::jsonb);

-- Storage bucket for signature/stamp images
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true);

-- Storage policies for company-assets bucket
CREATE POLICY "Admins can upload company assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete company assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view company assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');
