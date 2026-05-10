
-- Documents table for booking-related file uploads
CREATE TABLE public.booking_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'nid', 'photo', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.booking_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload own documents" ON public.booking_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.booking_documents FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all documents" ON public.booking_documents FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for booking documents
INSERT INTO storage.buckets (id, name, public) VALUES ('booking-documents', 'booking-documents', false);

-- Storage policies
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'booking-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'booking-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'booking-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all booking documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'booking-documents' AND public.has_role(auth.uid(), 'admin'));
