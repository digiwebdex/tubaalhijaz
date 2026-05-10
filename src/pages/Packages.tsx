import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { motion } from "framer-motion";
import { Check, ArrowRight, Filter } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-kaaba-golden.jpg";
import medinaImage from "@/assets/hero-medina.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import PackageCard from "@/components/PackageCard";

const fallbackImages = [heroImage, medinaImage];

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

const Packages = () => {
  const { t, language } = useLanguage();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Support URL query param ?type=air_ticket
  const urlType = new URLSearchParams(window.location.search).get("type");
  const [typeFilter, setTypeFilter] = useState(urlType || "all");

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await apiClient.from("packages").select("*").eq("is_active", true).eq("show_on_website", true).order("price", { ascending: true });
      setPackages(data || []);
      setLoading(false);
    };
    fetchPackages();
  }, []);

  const types = [...new Set(packages.map((p) => p.type))].sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a);
    const bi = TYPE_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const filtered = typeFilter === "all" ? packages : packages.filter((p) => p.type === typeFilter);

  // Group filtered packages by type
  const grouped = filtered.reduce((acc: Record<string, any[]>, pkg) => {
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
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Packages - হজ্জ, উমরাহ ও ট্যুর প্যাকেজ"
        description="মানাসিক ট্রাভেল হাব - সাশ্রয়ী মূল্যে হজ্জ, উমরাহ, ভিসা ও ট্যুর প্যাকেজ। Affordable Hajj, Umrah & Tour packages."
        canonicalUrl="/packages"
        keywords="Hajj package, Umrah package, হজ্জ প্যাকেজ, উমরাহ প্যাকেজ, ভিসা, ট্যুর"
        jsonLd={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Packages", url: "/packages" },
        ])}
      />
      <Navbar />

      <div className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Packages" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background" />
        </div>
        <div className="relative container mx-auto px-4 pt-16 pb-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">{t("packagesPage.label")}</span>
            <h1 className="font-heading text-3xl md:text-5xl font-bold mt-3 mb-4">
              {t("packagesPage.heading")} <span className="text-gradient-gold">{t("packagesPage.headingHighlight")}</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">{t("packagesPage.description")}</p>
            <Link to="/booking"
              className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground font-semibold px-8 py-3.5 rounded-lg text-sm hover:opacity-90 transition-opacity shadow-gold">
              {t("nav.bookNow")} <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {types.length > 1 && (
          <div className="flex gap-2 justify-center mb-10 flex-wrap">
            <button onClick={() => setTypeFilter("all")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                typeFilter === "all" ? "bg-gradient-gold text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>
              <Filter className="h-3.5 w-3.5" /> {t("packagesPage.allPackages")}
            </button>
            {types.map((tp) => (
              <button key={tp} onClick={() => setTypeFilter(tp)}
                className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                  typeFilter === tp ? "bg-gradient-gold text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}>
                {TYPE_LABELS[tp]?.[language]?.replace(" Packages", "").replace(" প্যাকেজ", "") || tp}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">{t("packagesPage.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">{t("packagesPage.empty")}</div>
        ) : (
          <div className="space-y-16">
            {sortedTypes.map((type) => {
              const typePkgs = grouped[type];
              const label = TYPE_LABELS[type]?.[language] || `${type.charAt(0).toUpperCase() + type.slice(1)} Packages`;

              return (
                <div key={type}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3 mb-8"
                  >
                    <div className="h-8 w-1.5 rounded-full bg-gradient-gold" />
                    <h2 className="font-heading text-2xl md:text-3xl font-bold capitalize">{label}</h2>
                    <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                      {typePkgs.length}
                    </span>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {typePkgs.map((pkg: any, i: number) => (
                      <PackageCard
                        key={pkg.id}
                        pkg={pkg}
                        index={i}
                        onBook={() => window.location.assign(`/packages/${pkg.id}`)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Packages;
