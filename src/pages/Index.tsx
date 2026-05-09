import Navbar from "@/components/Navbar";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import UmrahProgramsSection from "@/components/UmrahProgramsSection";
import WhyChooseUsSection from "@/components/WhyChooseUsSection";
import TransportSection from "@/components/TransportSection";
import CateringSection from "@/components/CateringSection";
import GallerySection from "@/components/GallerySection";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import BackToTop from "@/components/BackToTop";
import { useSectionVisibility } from "@/hooks/useSectionVisibility";
import SEOHead, { organizationJsonLd } from "@/components/SEOHead";
import { SiteContentProvider } from "@/hooks/useSiteContentProvider";

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
        {show("programs") && <UmrahProgramsSection />}
        {show("why-us") && <WhyChooseUsSection />}
        {show("transport") && <TransportSection />}
        {show("catering") && <CateringSection />}
        {show("about") && <AboutSection />}
        {show("gallery") && <GallerySection />}
        {show("contact") && <ContactSection />}
        <Footer />
        <WhatsAppFloat />
        <BackToTop />
      </div>
    </SiteContentProvider>
  );
};

export default Index;

