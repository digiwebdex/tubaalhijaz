import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bus, Car, MapPin, Users, Shield, Clock, CheckCircle2, Phone, ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import BackToTop from "@/components/BackToTop";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/api";
import { useLanguage } from "@/i18n/LanguageContext";
import TransportOrderDialog, { TransportService } from "@/components/TransportOrderDialog";
import ServiceGallery from "@/components/ServiceGallery";
import ReviewsSection from "@/components/ReviewsSection";
import transportImg from "@/assets/tuba-transport.jpg";

const fallback: TransportService[] = [
  { vehicle_type: "Sedan (1–3 pax)", route_from: "Jeddah Airport", route_to: "Makkah Hotel", price_sar: 250, capacity: 3 },
  { vehicle_type: "SUV / GMC (1–5 pax)", route_from: "Jeddah Airport", route_to: "Makkah Hotel", price_sar: 380, capacity: 5 },
  { vehicle_type: "Hiace (1–11 pax)", route_from: "Makkah", route_to: "Madinah", price_sar: 850, capacity: 11 },
  { vehicle_type: "Coaster (1–25 pax)", route_from: "Ziyarah Tour", route_to: "Makkah", price_sar: 1200, capacity: 25 },
  { vehicle_type: "Bus 30-Seater", route_from: "Madinah", route_to: "Makkah", price_sar: 1800, capacity: 30 },
  { vehicle_type: "Bus 50-Seater", route_from: "Madinah", route_to: "Makkah", price_sar: 2500, capacity: 50 },
];

const features = [
  { icon: Shield, en: "Licensed Drivers", bn: "লাইসেন্সধারী চালক" },
  { icon: Clock, en: "24/7 Available", bn: "২৪/৭ উপলব্ধ" },
  { icon: Users, en: "Group Rides", bn: "গ্রুপ রাইড" },
  { icon: CheckCircle2, en: "Free Cancel <24h", bn: "২৪ ঘণ্টা ফ্রি ক্যান্সেল" },
];

export default function TransportPage() {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const [selected, setSelected] = useState<TransportService | null>(null);

  const { data } = useQuery({
    queryKey: ["transport_services_full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transport_services")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_website", true)
        .order("display_order", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const services: TransportService[] = data && data.length > 0 ? data : fallback;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        canonicalUrl="/transport"
        title="Transport Service in Makkah & Madinah | TUBA ALHIJAZ"
        description="Book private transport: Jeddah airport pickup, Makkah–Madinah transfers, Ziyarat tours. Sedan, SUV, Hiace, Coaster & buses with licensed drivers."
        keywords="Umrah transport, Makkah Madinah transfer, Jeddah airport pickup, Ziyarat tour"
      />
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <img src={transportImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/60 to-charcoal/30" />
        <div className="container mx-auto px-4 relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 text-sm">
            <ArrowLeft className="h-4 w-4" /> {isBn ? "হোমে ফিরুন" : "Back to Home"}
          </Link>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-primary/40 rounded-full px-4 py-2 mb-4">
            <Bus className="h-4 w-4 text-primary-glow" />
            <span className="text-white text-xs font-bold tracking-[0.25em] uppercase">{isBn ? "ট্রান্সপোর্ট সার্ভিস" : "Transport Service"}</span>
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-white max-w-3xl leading-tight mb-4">
            {isBn ? "আরামদায়ক ও নিরাপদ যাতায়াত পুরো হিজাজে" : "Comfortable, safe rides across Hijaz"}
          </h1>
          <p className="text-white/85 max-w-2xl text-lg">
            {isBn
              ? "জেদ্দা এয়ারপোর্ট থেকে হোটেল, মক্কা–মদিনা ট্রান্সফার, জিয়ারাহ ট্যুর — সম্পূর্ণ অনলাইন বুকিং।"
              : "Airport pickups, intercity transfers and Ziyarat tours — fully online booking, instant confirmation."}
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {features.map((f) => (
              <div key={f.en} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1.5 text-xs text-white">
                <f.icon className="h-3.5 w-3.5 text-primary-glow" />
                {isBn ? f.bn : f.en}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-primary text-xs font-bold tracking-[0.3em] uppercase">{isBn ? "সব প্যাকেজ" : "All Packages"}</span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold mt-2">
              {isBn ? "আপনার প্রয়োজন অনুযায়ী গাড়ি বেছে নিন" : "Choose the vehicle that fits your trip"}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-luxury transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-sunset flex items-center justify-center">
                    <Car className="h-6 w-6 text-white" />
                  </div>
                  {s.capacity && (
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {s.capacity} pax
                    </div>
                  )}
                </div>
                <h3 className="font-heading text-xl font-bold mb-2">{s.vehicle_type}</h3>
                <div className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>{s.route_from} → {s.route_to}</span>
                </div>

                <ul className="space-y-1.5 text-sm text-muted-foreground mb-5">
                  {[
                    isBn ? "AC ও আরামদায়ক সিটিং" : "Air-conditioned, premium seating",
                    isBn ? "অভিজ্ঞ লাইসেন্সধারী চালক" : "Experienced licensed driver",
                    isBn ? "ফ্রি লাগেজ অ্যালাউন্স" : "Free luggage allowance",
                    isBn ? "অন-টাইম পিকআপ গ্যারান্টি" : "On-time pickup guarantee",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-end justify-between pt-4 border-t border-border">
                  <div>
                    <div className="text-xs text-muted-foreground">{isBn ? "শুরু" : "From"}</div>
                    <div className="font-heading text-2xl font-bold text-primary">SAR {s.price_sar}</div>
                  </div>
                  <Button onClick={() => setSelected(s)} className="bg-gradient-sunset text-white">
                    {isBn ? "বুক করুন" : "Book Now"}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive gallery */}
      <ServiceGallery
        title={{ en: "Our fleet & journeys", bn: "আমাদের ফ্লিট ও যাত্রা" }}
        subtitle={{
          en: "Real photos and videos from our daily transport service across Makkah, Madinah and Jeddah.",
          bn: "মক্কা, মদিনা ও জেদ্দায় আমাদের প্রতিদিনের ট্রান্সপোর্ট সার্ভিসের ছবি ও ভিডিও।",
        }}
      />

      {/* Reviews */}
      <ReviewsSection title={{ en: "What our pilgrims say", bn: "আমাদের যাত্রীদের কথা" }} />

      {/* CTA */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-charcoal via-charcoal/95 to-charcoal/90">
        {/* Animated gradient mesh */}
        <motion.div
          className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-primary/30 blur-3xl"
          animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 w-[520px] h-[520px] rounded-full bg-accent/30 blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Floating sparkles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary-glow/70"
            style={{ left: `${(i * 83) % 100}%`, top: `${(i * 47) % 100}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 1, 0.2], scale: [0.8, 1.4, 0.8] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
          />
        ))}

        {/* Animated road with moving car */}
        <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none">
          <div className="absolute bottom-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute bottom-6 left-0 right-0 h-px overflow-hidden">
            <motion.div
              className="h-full w-32 bg-gradient-to-r from-transparent via-primary-glow to-transparent"
              animate={{ x: ["-10%", "110%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <motion.div
            className="absolute bottom-7 text-primary-glow"
            animate={{ x: ["-8%", "108%"] }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          >
            <Car className="h-7 w-7 drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)]" />
          </motion.div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Pulsing star icon */}
          <motion.div
            className="inline-flex items-center justify-center mb-5"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/40 blur-xl"
                animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <Sparkles className="h-8 w-8 text-primary-glow relative" />
            </div>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-3 text-white"
          >
            {isBn ? "চলুন আপনার পবিত্র যাত্রা পরিকল্পনা করি" : "Let's plan your "}
            <span className="text-gradient-sunset italic">{isBn ? "" : "blessed journey"}</span>
          </motion.h3>
          <p className="text-white/80 max-w-xl mx-auto mb-8">
            {isBn ? "আমাদের মক্কা-ভিত্তিক টিমের সাথে সরাসরি কথা বলুন — যেকোনো সময়।" : "Speak directly with our Makkah-based team — anytime."}
          </p>

          {/* Phone CTA with ripple */}
          <div className="relative inline-flex">
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-primary-glow"
              animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-primary-glow"
              animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1 }}
            />
            <a
              href="tel:+966534919814"
              className="relative inline-flex items-center gap-3 bg-white text-charcoal font-bold px-8 py-4 rounded-full shadow-luxury hover:scale-105 transition-transform"
            >
              <motion.span
                animate={{ rotate: [0, -15, 15, -15, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
                className="inline-flex"
              >
                <Phone className="h-5 w-5 text-primary" />
              </motion.span>
              +966 53 491 9814
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              { en: "24/7 Support", bn: "২৪/৭ সাপোর্ট" },
              { en: "Instant Confirmation", bn: "তাৎক্ষণিক নিশ্চিতকরণ" },
              { en: "Best Price Guarantee", bn: "বেস্ট প্রাইস গ্যারান্টি" },
            ].map((b, i) => (
              <motion.div
                key={b.en}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-3 py-1.5 text-xs text-white/90"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-primary-glow" />
                {isBn ? b.bn : b.en}
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      <Footer />
      <WhatsAppFloat />
      <BackToTop />
      <TransportOrderDialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)} service={selected} />
    </div>
  );
}
