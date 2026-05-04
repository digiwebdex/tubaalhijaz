import { motion } from "framer-motion";
import { Shield, Heart, Award, Clock, MapPin, Phone, Users, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSiteContent } from "@/hooks/useSiteContent";
import heroImage from "@/assets/hero-kaaba-golden.jpg";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";

const reasonIcons = [Shield, Heart, Award, Clock];

const About = () => {
  const { data: content } = useSiteContent("about");
  const { language, t } = useLanguage();
  const bn = language === "bn";

  const description = content?.description || t("about.description");
  const reasons = content?.reasons || [
    { title: t("about.reason1.title"), desc: t("about.reason1.desc") },
    { title: t("about.reason2.title"), desc: t("about.reason2.desc") },
    { title: t("about.reason3.title"), desc: t("about.reason3.desc") },
    { title: t("about.reason4.title"), desc: t("about.reason4.desc") },
  ];

  const stats = [
    { icon: Users, value: bn ? "১০,০০০+" : "10,000+", label: bn ? "সুখী হাজী" : "Happy Pilgrims" },
    { icon: Star, value: "4.9", label: bn ? "গ্রাহক রেটিং" : "Client Rating" },
    { icon: MapPin, value: bn ? "১৫+" : "15+", label: bn ? "বছরের অভিজ্ঞতা" : "Years Experience" },
    { icon: Phone, value: bn ? "২৪/৭" : "24/7", label: bn ? "সহায়তা" : "Support" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="About Us - আমাদের সম্পর্কে"
        description="তুবা আলহিজাজ - বাংলাদেশের বিশ্বস্ত হজ্জ ও উমরাহ সেবা প্রদানকারী প্রতিষ্ঠান।"
        canonicalUrl="/about"
        keywords="তুবা আলহিজাজ, TUBA ALHIJAZ, about, আমাদের সম্পর্কে, হজ্জ সেবা"
        jsonLd={breadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ])}
      />
      <Navbar />

      {/* Hero */}
      <div className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="About" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background" />
        </div>
        <div className="relative container mx-auto px-4 pt-16 pb-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">
              {bn ? "আমাদের সম্পর্কে" : "About Us"}
            </span>
            <h1 className="font-heading text-3xl md:text-5xl font-bold mt-3 mb-4">
              {t("about.heading")} <span className="text-gradient-gold">{t("about.headingHighlight")}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20 max-w-4xl mx-auto"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-6 text-center">
              <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Why Choose Us */}
        <div className="max-w-5xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="text-primary text-sm font-medium tracking-[0.3em] uppercase">
              {t("about.label")}
            </span>
            <h2 className="font-heading text-3xl font-bold mt-3">
              {bn ? "যা আমাদের " : "What Sets Us "}
              <span className="text-gradient-gold">{bn ? "আলাদা করে" : "Apart"}</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {reasons.map((r: any, i: number) => {
              const IconComp = reasonIcons[i % reasonIcons.length];
              return (
                <motion.div
                  key={r.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <IconComp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg mb-1">{r.title}</h3>
                    <p className="text-sm text-muted-foreground">{r.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card border border-border rounded-2xl p-10 text-center max-w-3xl mx-auto shadow-luxury"
        >
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
            {bn ? "আপনার " : "Ready to Begin Your "}
            <span className="text-gradient-gold">{bn ? "পবিত্র যাত্রা শুরু করতে প্রস্তুত?" : "Sacred Journey?"}</span>
          </h2>
          <p className="text-muted-foreground mb-8">
            {bn
              ? "আজই আমাদের সাথে যোগাযোগ করুন বিনামূল্যে পরামর্শ এবং ব্যক্তিগত প্যাকেজ সুপারিশের জন্য।"
              : "Contact us today for a free consultation and personalized package recommendation."}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/packages"
              className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground font-semibold px-8 py-3.5 rounded-lg text-sm hover:opacity-90 transition-opacity shadow-gold"
            >
              {bn ? "প্যাকেজ দেখুন" : "View Packages"} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center border border-foreground/20 text-foreground font-semibold px-8 py-3.5 rounded-lg text-sm hover:bg-foreground/5 transition-colors"
            >
              {bn ? "যোগাযোগ করুন" : "Contact Us"}
            </Link>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default About;
