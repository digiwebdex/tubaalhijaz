import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { useBulkSiteContent } from "@/hooks/useSiteContentProvider";
import { useLanguage } from "@/i18n/LanguageContext";

const ContactSection = forwardRef<HTMLElement>(function ContactSection(_, ref) {
  const { data: content } = useBulkSiteContent("contact");
  const { t, language } = useLanguage();
  const bn = language === "bn";
  const [form, setForm] = useState({ name: "", phone: "", email: "", service: "", message: "" });
  const [loading, setLoading] = useState(false);

  const lc = content?.[language];
  const phone = content?.phone || "+966 53 491 9814";
  const email = lc?.email || content?.email || "tubaalhijaz@gmail.com";
  const location = lc?.location || content?.location || (bn
    ? "9QPP+H8Q, কিং ফাহাদ রোড, আল-আসকান,\nমক্কা মুকাররমা ২৪৩৪২, সৌদি আরব"
    : "9QPP+H8Q, King Fahd Road, Al-Askan,\nMakkah Al-Mukarramah 24342, KSA");
  const hours = lc?.hours || content?.hours || (bn ? "শনি – বৃহঃ : ৯টা – রাত ১০টা" : "Sat – Thu : 9 AM – 10 PM");

  const contactItems = [
    { icon: Phone, label: t("contact.phone"), value: phone, href: `tel:${phone.replace(/[\s-]/g, "")}` },
    { icon: Mail, label: t("contact.email"), value: email, href: `mailto:${email}` },
    { icon: MapPin, label: t("contact.location"), value: location, href: "#" },
    { icon: Clock, label: t("contact.hours"), value: hours, href: "#" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(t("contact.fillRequired"));
      return;
    }
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(t("contact.sentSuccess"));
        setForm({ name: "", phone: "", email: "", service: "", message: "" });
      } else {
        toast.error(t("contact.sendFailed"));
      }
    } catch {
      toast.error(t("contact.sendFailed"));
    }
    setLoading(false);
  };

  const inputClass = "bg-card border border-border rounded-xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all";

  return (
    <section ref={ref} id="contact" className="py-24 bg-secondary/30 relative overflow-hidden">
      <div className="absolute inset-0 islamic-pattern opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="text-primary text-xs font-semibold tracking-[0.3em] uppercase">{lc?.section_label || t("contact.label")}</span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3 mb-4">
            {lc?.heading || t("contact.heading")} <span className="text-gradient-gold">{lc?.heading_highlight || t("contact.headingHighlight")}</span>
          </h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-primary/30" />
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            <div className="h-px w-12 bg-primary/30" />
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-5">
            {contactItems.map((item) => (
              <a key={item.label} href={item.href} className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-soft transition-all group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="font-medium text-sm whitespace-pre-line">{item.value}</p>
                </div>
              </a>
            ))}
          </motion.div>

          <motion.form initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4 bg-card border border-border rounded-2xl p-7" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder={t("contact.yourName")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
              <input type="tel" placeholder={t("contact.phoneNumber")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} required />
            </div>
            <input type="email" placeholder={t("contact.emailAddress")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`w-full ${inputClass}`} />
            <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className={`w-full ${inputClass} text-muted-foreground`}>
              <option value="">{t("contact.selectService")}</option>
              {(lc?.form_services || content?.form_services || [
                t("contact.hajjPackage"),
                t("contact.umrahPackage"),
                t("contact.visaProcessing"),
                t("contact.airTicketService"),
                t("contact.hotelBooking"),
                t("contact.other"),
              ]).map((svc: string) => (
                <option key={svc}>{svc}</option>
              ))}
            </select>
            <textarea rows={4} placeholder={t("contact.yourMessage")} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={`w-full ${inputClass} resize-none`} />
            <button type="submit" disabled={loading} className="w-full bg-gradient-gold text-primary-foreground font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity shadow-gold disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <Send className="h-4 w-4" />
              {loading ? t("contact.sending") : t("contact.sendMessage")}
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
});

export default ContactSection;
