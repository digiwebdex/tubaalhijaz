import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import TransportSection from "@/components/TransportSection";
import CateringSection from "@/components/CateringSection";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import BackToTop from "@/components/BackToTop";
import { useSectionVisibility } from "@/hooks/useSectionVisibility";
import SEOHead, { organizationJsonLd } from "@/components/SEOHead";
import { SiteContentProvider } from "@/hooks/useSiteContentProvider";

const lazyRetry = (importFn: () => Promise<any>) =>
  lazy(() =>
    importFn().catch(() => {
      window.location.reload();
      return importFn();
    })
  );

const AboutSection = lazyRetry(() => import("@/components/AboutSection"));
const ContactSection = lazyRetry(() => import("@/components/ContactSection"));

const SectionFallback = () => <div className="py-20" />;

const Index = () => {
  const { visibility, loading } = useSectionVisibility();
  const show = (key: string) => loading || visibility[key] !== false;

  return (
    <SiteContentProvider>
      <div className="min-h-screen bg-background">
        <SEOHead
          canonicalUrl="/"
          description="TUBA ALHIJAZ — Makkah-based premium Umrah Visa, hotel booking, transport and catering services."
          keywords="TUBA ALHIJAZ, Umrah visa, Makkah hotel, Umrah transport, halal catering, Hajj"
          jsonLd={organizationJsonLd()}
        />
        <Navbar />
        {show("hero") && <HeroSection />}
        {show("services") && <ServicesSection />}
        {show("transport") && <TransportSection />}
        {show("catering") && <CateringSection />}
        {show("about") && (
          <Suspense fallback={<SectionFallback />}>
            <AboutSection />
          </Suspense>
        )}
        {show("contact") && (
          <Suspense fallback={<SectionFallback />}>
            <ContactSection />
          </Suspense>
        )}
        <Footer />
        <WhatsAppFloat />
        <BackToTop />
      </div>
    </SiteContentProvider>
  );
};

export default Index;

