
-- Key-value CMS table for all editable website content
CREATE TABLE public.site_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key text NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read site content (public website)
CREATE POLICY "Anyone can view site content"
ON public.site_content
FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage site content"
ON public.site_content
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default content sections
INSERT INTO public.site_content (section_key, content) VALUES
('hero', '{
  "badge": "Trusted Since 2010",
  "heading_line1": "Your Sacred",
  "heading_line2": "Journey",
  "heading_highlight": "Begins Here",
  "subheading": "Premium Hajj & Umrah experiences from Chittagong, Bangladesh. Every detail crafted for your peace of mind.",
  "cta_primary": "Explore Packages",
  "cta_secondary": "Contact Us",
  "stats": [
    {"value": "15+", "label": "Years Experience"},
    {"value": "10K+", "label": "Happy Pilgrims"},
    {"value": "50+", "label": "Premium Packages"},
    {"value": "4.9★", "label": "Client Rating"}
  ]
}'::jsonb),
('services', '{
  "section_label": "What We Offer",
  "heading": "Our",
  "heading_highlight": "Services",
  "description": "Comprehensive travel services to make your sacred journey comfortable and memorable",
  "items": [
    {"icon": "BookOpen", "title": "Hajj", "desc": "Complete Hajj packages with expert guidance and spiritual support"},
    {"icon": "Globe", "title": "Umrah", "desc": "Year-round Umrah packages for individuals, families and groups"},
    {"icon": "CreditCard", "title": "Visa", "desc": "Hassle-free visa processing for Saudi Arabia and beyond"},
    {"icon": "Plane", "title": "Air Ticket", "desc": "Best-price airline tickets with flexible booking options"},
    {"icon": "Building2", "title": "Hotel", "desc": "Premium hotels near Haram with stunning views"},
    {"icon": "Bus", "title": "Transport", "desc": "Comfortable ground transportation throughout your journey"},
    {"icon": "MapPin", "title": "Ziyara", "desc": "Guided tours to all historical and sacred sites"},
    {"icon": "Users", "title": "Guide", "desc": "Experienced multilingual guides for a seamless experience"}
  ]
}'::jsonb),
('about', '{
  "section_label": "Why Choose Us",
  "heading": "A Journey of",
  "heading_highlight": "Faith & Trust",
  "description": "RAHE KABA Tours & Travels has been serving pilgrims from Chittagong, Bangladesh with excellence since 2010. Our commitment to quality, transparency, and spiritual guidance makes us the preferred choice for thousands of families.",
  "reasons": [
    {"title": "Government Approved", "desc": "Fully licensed and government-approved Hajj & Umrah agency"},
    {"title": "Personalized Care", "desc": "Dedicated support from booking to return journey"},
    {"title": "Premium Quality", "desc": "Top-rated hotels, transport and services at every step"},
    {"title": "15+ Years", "desc": "Over a decade of trusted service in sacred travel"}
  ]
}'::jsonb),
('contact', '{
  "section_label": "Get In Touch",
  "heading": "Contact",
  "heading_highlight": "Us",
  "phone": "+880 1601-505050",
  "email": "rahekaba.info@gmail.com",
  "location": "Chittagong, Bangladesh",
  "hours": "Sat - Thu: 9AM - 9PM"
}'::jsonb),
('footer', '{
  "company_name": "RAHE KABA",
  "company_tagline": "Tours & Travels",
  "description": "Your trusted partner for Hajj & Umrah from Chittagong, Bangladesh. Making sacred journeys seamless since 2010.",
  "phone": "+880 1601-505050",
  "email": "rahekaba.info@gmail.com",
  "address": "Chittagong, Bangladesh",
  "services_list": ["Hajj Packages", "Umrah Packages", "Visa Processing", "Air Tickets", "Hotel Booking", "Ziyara Tours"],
  "developer_name": "DigiWebDex",
  "developer_url": "https://digiwebdex.com"
}'::jsonb),
('navbar', '{
  "phone": "+880 1601-505050",
  "cta_text": "Book Now"
}'::jsonb);
