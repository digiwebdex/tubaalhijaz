
-- Add receipt_file_path to all 3 payment tables
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_file_path text;
ALTER TABLE public.moallem_payments ADD COLUMN IF NOT EXISTS receipt_file_path text;
ALTER TABLE public.supplier_agent_payments ADD COLUMN IF NOT EXISTS receipt_file_path text;

-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', false) ON CONFLICT DO NOTHING;

-- RLS policies for payment-receipts bucket
CREATE POLICY "Admins can manage payment receipts" ON storage.objects FOR ALL USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can read payment receipts" ON storage.objects FOR SELECT USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'::public.app_role));
