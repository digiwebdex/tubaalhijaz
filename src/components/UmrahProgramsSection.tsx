import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Check, Crown, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import UmrahOrderDialog from "@/components/UmrahOrderDialog";
import { useNavigate } from "react-router-dom";
import { requireCustomerLogin } from "@/lib/bookingAuth";

export type ProgramTier = "economic" | "silver" | "golden" | "platinum";

export const PROGRAMS: {
  key: ProgramTier;
  stars: number;
  basePriceSAR: number;
  ribbon?: string;
}[] = [
  { key: "economic", stars: 2, basePriceSAR: 1450 },
  { key: "silver", stars: 3, basePriceSAR: 2150 },
  { key: "golden", stars: 4, basePriceSAR: 3250, ribbon: "Most Popular" },
  { key: "platinum", stars: 5, basePriceSAR: 4850 },
];

const COPY = {
  en: {
    label: "UMRAH PROGRAMS",
    heading: "Choose your",
    headingHighlight: "Umrah experience",
    sub: "Four transparent tiers — from economy to platinum — each fully inclusive of visa, hotel, transport, meals and Ziyarat.",
    cta: "Book this program",
    perPerson: "per person",
    tiers: {
      economic: { name: "Economic", tagline: "Smart value pilgrimage", features: ["Umrah visa included", "2★ hotel · ~2 km from Haram", "Shared room (4–6 pax)", "Group bus transfer", "Standard meals", "Airport meet & greet"] },
      silver:   { name: "Silver",   tagline: "Comfort & convenience",  features: ["Umrah visa included", "3★ hotel · ~1 km from Haram", "Quad room (4 pax)", "Hiace van transfers", "Buffet breakfast + dinner", "Madinah Ziyarat tour"] },
      golden:   { name: "Golden",   tagline: "Premium spiritual stay", features: ["Umrah visa included", "4★ hotel · ~500 m from Haram", "Triple sharing room", "Private SUV transfers", "Full-board buffet", "Makkah + Madinah Ziyarat", "Dedicated guide"] },
      platinum: { name: "Platinum", tagline: "Luxury VIP journey",     features: ["Express Umrah visa", "5★ hotel adjacent to Haram", "Double / Twin room", "VIP Sedan + chauffeur", "5★ buffet, all meals", "Custom Ziyarat itinerary", "24/7 personal concierge"] },
    },
  },
  bn: {
    label: "উমরাহ প্রোগ্রাম",
    heading: "আপনার পছন্দের",
    headingHighlight: "উমরাহ প্যাকেজ",
    sub: "চারটি স্বচ্ছ প্যাকেজ — ভিসা, হোটেল, ট্রান্সপোর্ট, খাবার ও জিয়ারাহ সবকিছু সহ।",
    cta: "এই প্যাকেজ বুক করুন",
    perPerson: "প্রতি জন",
    tiers: {
      economic: { name: "ইকোনমিক", tagline: "সাশ্রয়ী হজ্ব যাত্রা", features: ["উমরাহ ভিসা", "২★ হোটেল · হারাম থেকে ~২ কিমি", "শেয়ার্ড রুম (৪–৬ জন)", "গ্রুপ বাস ট্রান্সফার", "সাধারণ খাবার", "এয়ারপোর্ট রিসেপশন"] },
      silver:   { name: "সিলভার",  tagline: "আরাম ও সুবিধা",        features: ["উমরাহ ভিসা", "৩★ হোটেল · হারাম থেকে ~১ কিমি", "কোয়াড রুম (৪ জন)", "হায়েস ভ্যান", "বুফে ব্রেকফাস্ট + ডিনার", "মদিনা জিয়ারাহ"] },
      golden:   { name: "গোল্ডেন", tagline: "প্রিমিয়াম আধ্যাত্মিক যাত্রা", features: ["উমরাহ ভিসা", "৪★ হোটেল · ~৫০০ মি", "ট্রিপল শেয়ারিং", "প্রাইভেট এসইউভি", "ফুল-বোর্ড বুফে", "মক্কা + মদিনা জিয়ারাহ", "ডেডিকেটেড গাইড"] },
      platinum: { name: "প্লাটিনাম", tagline: "লাক্সারি ভিআইপি যাত্রা", features: ["এক্সপ্রেস ভিসা", "৫★ হোটেল · হারামের পাশে", "ডাবল / টুইন রুম", "ভিআইপি সেডান", "৫★ বুফে, সব মিল", "কাস্টম জিয়ারাহ", "২৪/৭ কনসিয়ার্জ"] },
    },
  },
};

const UmrahProgramsSection = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = COPY[language === "bn" ? "bn" : "en"];
  const [openTier, setOpenTier] = useState<ProgramTier | null>(null);

  return (
    <section id="programs" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 islamic-pattern opacity-30 pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-block text-primary text-xs font-bold tracking-[0.3em] uppercase mb-3">
            {t.label}
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-4">
            {t.heading} <span className="text-gradient-gold italic">{t.headingHighlight}</span>
          </h2>
          <p className="text-muted-foreground">{t.sub}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROGRAMS.map((p, i) => {
            const tier = t.tiers[p.key];
            const isFeatured = p.key === "golden";
            return (
              <motion.div
                key={p.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative rounded-2xl border p-6 flex flex-col bg-card transition-all hover:-translate-y-1 hover:shadow-luxury ${
                  isFeatured
                    ? "border-primary shadow-gold ring-1 ring-primary/30"
                    : "border-border"
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-primary-foreground text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-gold flex items-center gap-1">
                    <Crown className="h-3 w-3" /> {language === "bn" ? "জনপ্রিয়" : p.ribbon}
                  </div>
                )}

                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`h-4 w-4 ${idx < p.stars ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>

                <h3 className="font-heading text-2xl font-bold mb-1">{tier.name}</h3>
                <p className="text-xs text-muted-foreground mb-5">{tier.tagline}</p>

                <div className="mb-5">
                  <div className="text-xs text-muted-foreground mb-1">{language === "bn" ? "শুরু" : "From"}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-3xl font-bold text-gradient-gold tabular-nums">
                      SAR {p.basePriceSAR.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">{t.perPerson}</div>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-foreground/80">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={async () => {
                    if (!(await requireCustomerLogin(navigate, `/?book=umrah&tier=${p.key}#programs`))) return;
                    setOpenTier(p.key);
                  }}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isFeatured
                      ? "bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90"
                      : "border border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {t.cta} <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <UmrahOrderDialog
        open={openTier !== null}
        onOpenChange={(o) => !o && setOpenTier(null)}
        defaultTier={openTier ?? "silver"}
      />
    </section>
  );
};

export default UmrahProgramsSection;
