import { Phone, Mail, MapPin, Facebook, Instagram, Sparkles } from "lucide-react";
import logo from "@/assets/tuba-logo.png";
import { useBulkSiteContent } from "@/hooks/useSiteContentProvider";
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const { data: content } = useBulkSiteContent("footer");
  const { language } = useLanguage();
  const isBn = language === "bn";

  const lc = content?.[language];
  const companyName = content?.company_name || "TUBA ALHIJAZ";
  const tagline = lc?.company_tagline || content?.company_tagline || (isBn ? "মক্কা থেকে আপনার সেবায়" : "Your trusted partner in Hijaz");
  const phone = content?.phone || "+966 53 491 9814";
  const email = content?.email || "tubaalhijaz@gmail.com";
  const address = lc?.address || content?.address || "9QPP+H8Q, King Fahd Road, Al-Askan,\nMakkah Al-Mukarramah 24342, KSA";
  const servicesList = lc?.services_list || content?.services_list || [
    isBn ? "উমরাহ ভিসা" : "Umrah Visa",
    isBn ? "হোটেল বুকিং" : "Hotel Booking",
    isBn ? "ট্রান্সপোর্ট" : "Transport",
    isBn ? "ক্যাটারিং" : "Catering",
  ];

  const quickLinks = [
    { label: isBn ? "হোম" : "Home", href: "/" },
    { label: isBn ? "সার্ভিস" : "Services", href: "#services" },
    { label: isBn ? "ট্রান্সপোর্ট" : "Transport", href: "#transport" },
    { label: isBn ? "ক্যাটারিং" : "Catering", href: "#catering" },
    { label: isBn ? "যোগাযোগ" : "Contact", href: "#contact" },
  ];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-gradient-brand py-16 md:py-20 relative">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-accent/40 blur-3xl" />
          <div className="container mx-auto px-4 relative z-10 text-center">
            <Sparkles className="h-10 w-10 text-primary-glow mx-auto mb-4" />
            <h3 className="text-white font-heading text-3xl md:text-5xl font-bold mb-4">
              {isBn ? "আপনার পবিত্র যাত্রার পরিকল্পনা শুরু হোক" : "Let's plan your blessed journey"}
            </h3>
            <p className="text-white/85 text-base md:text-lg max-w-xl mx-auto mb-8">
              {isBn
                ? "মক্কা থেকে সরাসরি আমাদের টিমের সাথে কথা বলুন।"
                : "Speak directly with our Makkah-based team — anytime."}
            </p>
            <a
              href={`tel:${phone.replace(/[\s-+]/g, "")}`}
              className="inline-flex items-center gap-2 bg-white text-accent font-bold px-8 py-4 rounded-full shadow-elevated hover:scale-105 transition-transform"
            >
              <Phone className="h-4 w-4" />
              {phone}
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-charcoal text-white py-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-sunset" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="mb-5">
                <div className="bg-white/95 rounded-2xl p-3 inline-block shadow-lg">
                  <img src={logo} alt="TUBA ALHIJAZ Logo" className="h-16 w-auto object-contain" />
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-5 text-white/70 italic">
                {isBn
                  ? "মক্কা মুকাররমা থেকে আপনার বিশ্বস্ত উমরাহ পার্টনার।"
                  : "Your trusted Umrah partner, based in the blessed city of Makkah."}
              </p>
              <div className="flex items-center gap-3">
                <a href="#" target="_blank" rel="noopener noreferrer" className="bg-white/8 hover:bg-primary/80 transition-all p-2.5 rounded-xl border border-white/10">
                  <Facebook className="h-4 w-4 text-white" />
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" className="bg-white/8 hover:bg-pink-600/80 transition-all p-2.5 rounded-xl border border-white/10">
                  <Instagram className="h-4 w-4 text-white" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-heading font-semibold mb-5 text-primary text-sm uppercase tracking-wider">
                {isBn ? "কুইক লিংক" : "Quick Links"}
              </h4>
              <ul className="space-y-3 text-sm text-white/60">
                {quickLinks.map((l) => (
                  <li key={l.href}><a href={l.href} className="hover:text-primary transition-colors">{l.label}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-heading font-semibold mb-5 text-primary text-sm uppercase tracking-wider">
                {isBn ? "সার্ভিস" : "Services"}
              </h4>
              <ul className="space-y-3 text-sm text-white/60">
                {servicesList.map((s: string) => <li key={s}><span>{s}</span></li>)}
              </ul>
            </div>

            <div>
              <h4 className="font-heading font-semibold mb-5 text-primary text-sm uppercase tracking-wider">
                {isBn ? "যোগাযোগ" : "Contact"}
              </h4>
              <ul className="space-y-4 text-sm text-white/60">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5"><Phone className="h-3.5 w-3.5 text-primary" /></div>
                  <span>{phone}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0"><Mail className="h-3.5 w-3.5 text-primary" /></div>
                  {email}
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5"><MapPin className="h-3.5 w-3.5 text-primary" /></div>
                  <span className="whitespace-pre-line">{address}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 pt-8 border-t border-white/10 text-center text-sm text-white/40">
            <p>© {new Date().getFullYear()} {companyName}. {isBn ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}</p>
            <p className="mt-2 text-xs text-white/30">{tagline}</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
