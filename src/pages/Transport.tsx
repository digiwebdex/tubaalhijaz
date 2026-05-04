import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bus, Car, MapPin, Users, Shield, Clock, CheckCircle2, Phone, ArrowLeft } from "lucide-react";
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

      {/* CTA */}
      <section className="py-16 bg-secondary/40">
        <div className="container mx-auto px-4 text-center">
          <h3 className="font-heading text-2xl md:text-3xl font-bold mb-3">
            {isBn ? "কাস্টম রুট দরকার?" : "Need a custom route?"}
          </h3>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            {isBn ? "আমাদের সাথে যোগাযোগ করুন — আমরা কোটেশন তৈরি করে দেব।" : "Contact us and we'll prepare a tailored quotation for your group."}
          </p>
          <a href="tel:+966534919814" className="inline-flex items-center gap-2 bg-gradient-sunset text-white font-semibold px-7 py-3.5 rounded-full shadow-gold">
            <Phone className="h-4 w-4" /> +966 53 491 9814
          </a>
        </div>
      </section>

      <Footer />
      <WhatsAppFloat />
      <BackToTop />
      <TransportOrderDialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)} service={selected} />
    </div>
  );
}
