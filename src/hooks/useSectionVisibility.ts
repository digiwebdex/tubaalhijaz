import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

export const DEFAULT_SECTIONS: Record<string, { label: string; labelBn: string; enabled: boolean }> = {
  hero: { label: "Hero Banner", labelBn: "হিরো ব্যানার", enabled: true },
  services: { label: "Services", labelBn: "সেবাসমূহ", enabled: true },
  facilities: { label: "Facilities", labelBn: "সুবিধাসমূহ", enabled: true },
  packages: { label: "All Packages", labelBn: "সকল প্যাকেজ", enabled: true },
  air_tickets: { label: "Air Tickets", labelBn: "এয়ার টিকেট", enabled: true },
  visa_services: { label: "Visa Services", labelBn: "ভিসা সার্ভিস", enabled: true },
  tour_packages: { label: "Tour Packages", labelBn: "ট্যুর প্যাকেজ", enabled: true },
  guidelines: { label: "Guidelines", labelBn: "গাইডলাইন", enabled: true },
  video_guide: { label: "Video Guide", labelBn: "ভিডিও গাইড", enabled: true },
  gallery: { label: "Gallery", labelBn: "গ্যালারি", enabled: true },
  testimonials: { label: "Testimonials", labelBn: "প্রশংসাপত্র", enabled: true },
  about: { label: "About Us", labelBn: "আমাদের সম্পর্কে", enabled: true },
  contact: { label: "Contact", labelBn: "যোগাযোগ", enabled: true },
};

export type SectionVisibility = Record<string, boolean>;

export function useSectionVisibility() {
  const [visibility, setVisibility] = useState<SectionVisibility>(() => {
    const defaults: SectionVisibility = {};
    Object.entries(DEFAULT_SECTIONS).forEach(([key, val]) => {
      defaults[key] = val.enabled;
    });
    return defaults;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .from("company_settings")
      .select("*")
      .eq("setting_key", "section_visibility")
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.setting_value) {
          const saved = typeof data.setting_value === "string" ? JSON.parse(data.setting_value) : data.setting_value;
          setVisibility((prev) => ({ ...prev, ...saved }));
        }
        setLoading(false);
      });
  }, []);

  return { visibility, loading };
}
