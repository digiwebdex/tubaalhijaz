import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GuidelineSection from "@/components/GuidelineSection";
import SEOHead from "@/components/SEOHead";
import { useLanguage } from "@/i18n/LanguageContext";

const UmrahGuide = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        canonicalUrl="/umrah-guide"
        description="Complete Umrah guideline — step-by-step rituals, requirements and travel tips from TUBA ALHIJAZ."
        keywords="Umrah guide, Umrah guideline, how to perform Umrah, TUBA ALHIJAZ Umrah"
      />
      <Navbar />

      {/* Page header */}
      <section className="bg-gradient-mix py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 travel-pattern opacity-20" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <span className="inline-block bg-white/15 backdrop-blur-md text-white text-xs font-bold tracking-[0.25em] uppercase px-4 py-1.5 rounded-full border border-white/20 mb-4">
            {language === "bn" ? "ধাপে ধাপে গাইড" : "Step-by-step guide"}
          </span>
          <h1 className="font-heading text-4xl md:text-6xl font-extrabold text-white drop-shadow-md">
            {language === "bn" ? "উমরাহ গাইডলাইন" : "Umrah Guideline"}
          </h1>
          <p className="text-white/85 max-w-2xl mx-auto mt-4 text-base md:text-lg">
            {language === "bn"
              ? "উমরাহর প্রতিটি ধাপের সহজ ও সম্পূর্ণ নির্দেশিকা — প্রস্তুতি থেকে শুরু করে পবিত্র স্থানের আদব পর্যন্ত।"
              : "A complete walkthrough of every Umrah ritual — from pre-travel preparation to performing the sacred rites."}
          </p>
        </div>
      </section>

      <GuidelineSection />

      <Footer />
    </div>
  );
};

export default UmrahGuide;
