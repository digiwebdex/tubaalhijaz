import { motion } from "framer-motion";
import { ArrowUpRight, FileCheck, Hotel, Bus, UtensilsCrossed } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";

const ACCENT_OLIVE = "from-[hsl(var(--olive))] to-[hsl(var(--olive-dark))]";
const ACCENT_GOLD = "from-[hsl(var(--gold-light))] to-[hsl(var(--gold-dark))]";

const services = [
  {
    Icon: FileCheck,
    badge: "Visa",
    gradient: ACCENT_OLIVE,
    titleEn: "Umrah Visa",
    titleBn: "উমরাহ ভিসা",
    descEn: "Fast and reliable Umrah visa processing with full document support and clear timelines.",
    descBn: "দ্রুত ও নির্ভরযোগ্য উমরাহ ভিসা প্রসেসিং, পূর্ণ ডকুমেন্ট সহায়তাসহ।",
    href: "#contact",
  },
  {
    Icon: Hotel,
    badge: "Stay",
    gradient: ACCENT_GOLD,
    titleEn: "Hotel Booking",
    titleBn: "হোটেল বুকিং",
    descEn: "Premium hotels in Makkah and Madinah — walking distance to Haram & Masjid Nabawi.",
    descBn: "মক্কা ও মদিনায় হারাম-সংলগ্ন প্রিমিয়াম হোটেল।",
    href: "/hotels",
  },
  {
    Icon: Bus,
    badge: "Transport",
    gradient: ACCENT_OLIVE,
    titleEn: "Transport",
    titleBn: "ট্রান্সপোর্ট",
    descEn: "Airport pickup, Makkah–Madinah–Jeddah routes and Ziyarah tours in modern vehicles.",
    descBn: "এয়ারপোর্ট পিকআপ, মক্কা–মদিনা–জেদ্দা রুট ও জিয়ারাহ ট্যুর।",
    href: "#transport",
  },
  {
    Icon: UtensilsCrossed,
    badge: "Catering",
    gradient: ACCENT_GOLD,
    titleEn: "Catering",
    titleBn: "ক্যাটারিং",
    descEn: "Authentic Bangladeshi & Arabic halal meal plans delivered to your hotel daily.",
    descBn: "প্রতিদিন হোটেলে বাংলা ও আরবী হালাল খাবারের প্যাকেজ।",
    href: "#catering",
  },
];

const ServicesSection = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isBn = language === "bn";

  const handleClick = (href: string) => {
    if (href.startsWith("#")) {
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(href);
    }
  };

  return (
    <section id="services" className="py-24 relative overflow-hidden bg-background">
      <div className="absolute top-20 -left-32 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-80 h-80 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-block text-primary text-xs font-bold tracking-[0.3em] uppercase mb-3">
            {isBn ? "আমাদের সার্ভিস" : "What We Offer"}
          </span>
          <h2 className="font-heading text-4xl md:text-6xl font-bold mb-4 leading-tight">
            {isBn ? "মক্কা থেকে " : "Complete Umrah care, "}
            <span className="italic text-gradient-sunset">
              {isBn ? "পূর্ণাঙ্গ উমরাহ সেবা" : "from Makkah"}
            </span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            {isBn
              ? "ভিসা থেকে শুরু করে থাকা, যাতায়াত ও খাবার — আপনার পবিত্র সফরের সব আয়োজন এক জায়গায়।"
              : "From visa to stay, transport and meals — every detail of your sacred trip handled with care."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {services.map((s, i) => {
            const Icon = s.Icon;
            return (
              <motion.article
                key={s.titleEn}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.45 }}
                whileHover={{ y: -6 }}
                onClick={() => handleClick(s.href)}
                className="group relative bg-card border border-border rounded-2xl p-6 md:p-7 transition-all hover:shadow-luxury hover:border-primary/40 cursor-pointer overflow-hidden"
              >
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 group-hover:opacity-25 blur-2xl transition-opacity`} />
                <div className="flex items-start justify-between mb-5 relative">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-45 transition-all">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <span className={`inline-block bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent text-[10px] font-bold tracking-[0.2em] uppercase mb-2`}>
                  {s.badge}
                </span>
                <h3 className="font-heading text-2xl font-bold text-foreground mb-2 leading-snug">
                  {isBn ? s.titleBn : s.titleEn}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isBn ? s.descBn : s.descEn}
                </p>
                <div className={`absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r ${s.gradient} group-hover:w-full transition-all duration-500`} />
              </motion.article>
            );
          })}
        </div>

        {/* Coming soon strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            {isBn ? "শীঘ্রই আসছে" : "Coming Soon"}
          </p>
          <div className="inline-flex flex-wrap justify-center gap-3">
            {["Hajj", "Full Umrah Packages", "Student Consultancy"].map((t) => (
              <span key={t} className="px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-sm text-primary font-medium">
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;
