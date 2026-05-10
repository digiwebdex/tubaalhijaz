
-- Create public storage bucket for hotel images
INSERT INTO storage.buckets (id, name, public) VALUES ('hotel-images', 'hotel-images', true);

-- Anyone can view hotel images (public bucket)
CREATE POLICY "Anyone can view hotel images"
ON storage.objects FOR SELECT
USING (bucket_id = 'hotel-images');

-- Admins can upload hotel images
CREATE POLICY "Admins can upload hotel images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'hotel-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can update hotel images
CREATE POLICY "Admins can update hotel images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'hotel-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can delete hotel images
CREATE POLICY "Admins can delete hotel images"
ON storage.objects FOR DELETE
USING (bucket_id = 'hotel-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
