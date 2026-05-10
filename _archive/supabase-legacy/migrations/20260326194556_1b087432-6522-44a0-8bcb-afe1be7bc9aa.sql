
INSERT INTO public.site_content (section_key, content)
SELECT key, '{}'::jsonb
FROM unnest(ARRAY['testimonials', 'facilities', 'gallery', 'guideline', 'video_guide', 'whatsapp', 'packages']) AS key
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_content WHERE section_key = key
);
