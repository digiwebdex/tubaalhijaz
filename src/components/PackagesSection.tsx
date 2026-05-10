import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActivePackages } from "@/hooks/usePackagesData";
import PackageCard from "@/components/PackageCard";
import { requireCustomerLogin } from "@/lib/bookingAuth";

const TYPE_ORDER = ["hajj", "umrah", "tour", "visa", "air_ticket", "hotel", "transport", "ziyara"];
const TYPE_LABELS: Record<string, { en: string; bn: string }> = {
  hajj: { en: "Hajj Packages", bn: "হজ্জ প্যাকেজ" },
  umrah: { en: "Umrah Packages", bn: "উমরাহ প্যাকেজ" },
  tour: { en: "Tour Packages", bn: "ট্যুর প্যাকেজ" },
  visa: { en: "Visa Services", bn: "ভিসা সার্ভিস" },
  air_ticket: { en: "Air Tickets", bn: "এয়ার টিকেট" },
  hotel: { en: "Hotel Packages", bn: "হোটেল প্যাকেজ" },
  transport: { en: "Transport Packages", bn: "পরিবহন প্যাকেজ" },
  ziyara: { en: "Ziyara Packages", bn: "জিয়ারত প্যাকেজ" },
};

const PackagesSection = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { data: packages = [], isLoading: loading } = useActivePackages();

  if (loading || packages.length === 0) return null;

  const grouped = packages.reduce((acc: Record<string, any[]>, pkg) => {
    const type = pkg.type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(pkg);
    return acc;
  }, {});

  const sortedTypes = Object.keys(grouped).sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a);
    const bi = TYPE_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <section id="packages" className="py-24 bg-secondary/30 relative overflow-hidden">
      <div className="absolute inset-0 islamic-pattern opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <span className="text-primary text-xs font-semibold tracking-[0.3em] uppercase">{t("packages.label")}</span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3 mb-4">
            {t("packages.heading")} <span className="text-gradient-gold">{t("packages.headingHighlight")}</span>
          </h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-primary/30" />
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            <div className="h-px w-12 bg-primary/30" />
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("packages.description")}</p>
        </motion.div>

        {sortedTypes.map((type) => {
          const typePkgs = grouped[type];
          const label = TYPE_LABELS[type]?.[language] || `${type.charAt(0).toUpperCase() + type.slice(1)} Packages`;

          return (
            <div key={type} className="mb-16 last:mb-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 mb-8"
              >
                <div className="h-8 w-1.5 rounded-full bg-gradient-gold" />
                <h3 className="font-heading text-2xl md:text-3xl font-bold capitalize">{label}</h3>
                <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                  {typePkgs.length} {t("common.packagesSuffix")}
                </span>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 max-w-6xl mx-auto">
                {typePkgs.map((pkg: any, i: number) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    index={i}
                    onBook={async (p) => {
                      const bookingPath = `/booking?package=${p.id}`;
                      if (await requireCustomerLogin(navigate, bookingPath)) navigate(bookingPath);
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="text-center mt-10">
          <button
            onClick={() => navigate("/packages")}
            className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1"
          >
            {t("common.viewAll")} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

    </section>
  );
};

export default PackagesSection;
