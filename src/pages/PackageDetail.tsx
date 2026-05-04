import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/api";
import { motion } from "framer-motion";
import { Check, ArrowLeft, ArrowRight, Calendar, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-kaaba-golden.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import SEOHead, { productJsonLd, breadcrumbJsonLd } from "@/components/SEOHead";

const PackageDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPkg = async () => {
      const { data } = await supabase.from("packages").select("*").eq("id", id).eq("is_active", true).eq("show_on_website", true).single();
      setPkg(data);
      setLoading(false);
    };
    if (id) fetchPkg();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32 text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-32 gap-4">
          <p className="text-muted-foreground">{t("pkgDetail.notFound")}</p>
          <Link to="/packages" className="text-primary hover:underline">{t("pkgDetail.backToPackages")}</Link>
        </div>
      </div>
    );
  }

  const features = Array.isArray(pkg.features) ? pkg.features : [];
  const services = Array.isArray(pkg.services) ? pkg.services : [];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={pkg.name}
        description={pkg.description || `${pkg.name} - TUBA ALHIJAZ package`}
        canonicalUrl={`/packages/${pkg.id}`}
        ogImage={pkg.image_url || undefined}
        ogType="product"
        jsonLd={[
          productJsonLd({
            name: pkg.name,
            description: pkg.description,
            price: pkg.price,
            image: pkg.image_url,
            url: `/packages/${pkg.id}`,
          }),
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Packages", url: "/packages" },
            { name: pkg.name, url: `/packages/${pkg.id}` },
          ]),
        ]}
      />
      <Navbar />

      <div className="relative pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img src={pkg.image_url || heroImage} alt={pkg.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
        </div>
        <div className="relative container mx-auto px-4 pt-16 pb-4">
          <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-primary mb-6 inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> {t("pkgDetail.back")}
          </button>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="bg-primary/90 text-primary-foreground text-xs font-bold px-3 py-1 rounded-full capitalize">{pkg.type}</span>
            <h1 className="font-heading text-3xl md:text-5xl font-bold mt-4 mb-3">{pkg.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {pkg.duration_days && (
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {pkg.duration_days} {t("pkgDetail.days")}</span>
              )}
              {pkg.start_date && (
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {t("pkgDetail.starts")}: {new Date(pkg.start_date).toLocaleDateString()}</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="md:col-span-2 space-y-8">
            {pkg.description && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="font-heading text-xl font-bold mb-3">{t("pkgDetail.aboutPackage")}</h2>
                <p className="text-muted-foreground leading-relaxed">{pkg.description}</p>
              </motion.div>
            )}

            {features.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <h2 className="font-heading text-xl font-bold mb-4">{t("pkgDetail.whatsIncluded")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {features.map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {services.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <h2 className="font-heading text-xl font-bold mb-4">{t("pkgDetail.services")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{typeof s === 'string' ? s : s.name || JSON.stringify(s)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="sticky top-24">
            <div className="bg-card border border-border rounded-xl p-6 shadow-luxury">
              <p className="text-3xl font-heading font-bold text-primary mb-1">
                ৳{Number(pkg.price).toLocaleString("en-IN")}
              </p>
              <p className="text-sm text-muted-foreground mb-6">{t("pkgDetail.perPerson")}</p>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">{t("pkgDetail.type")}</span>
                  <span className="font-medium capitalize">{pkg.type}</span>
                </div>
                {pkg.duration_days && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">{t("pkgDetail.duration")}</span>
                    <span className="font-medium">{pkg.duration_days} {t("pkgDetail.days")}</span>
                  </div>
                )}
                {pkg.start_date && (
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">{t("pkgDetail.startDate")}</span>
                    <span className="font-medium">{new Date(pkg.start_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <Link to={`/booking?package=${pkg.id}`}
                className="w-full py-3 rounded-md text-sm font-semibold text-center inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground hover:opacity-90 transition-opacity shadow-gold">
                {t("nav.bookNow")} <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-3">{t("pkgDetail.installmentAvailable")}</p>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PackageDetail;