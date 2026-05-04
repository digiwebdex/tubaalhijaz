import { motion } from "framer-motion";
import { Bus, Car, MapPin, ArrowRight } from "lucide-react";
import transportImg from "@/assets/tuba-transport.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/api";

const fallback = [
  { vehicle_type: "Sedan (1–3 pax)", route_from: "Jeddah Airport", route_to: "Makkah Hotel", price_sar: 250 },
  { vehicle_type: "SUV (1–5 pax)", route_from: "Jeddah Airport", route_to: "Makkah Hotel", price_sar: 380 },
  { vehicle_type: "Hiace (1–11 pax)", route_from: "Makkah", route_to: "Madinah", price_sar: 850 },
  { vehicle_type: "Coaster (1–25 pax)", route_from: "Ziyarah Tour", route_to: "Makkah", price_sar: 1200 },
];

const TransportSection = () => {
  const { language } = useLanguage();
  const isBn = language === "bn";

  const { data } = useQuery({
    queryKey: ["transport_services_public"],
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

  const services = data && data.length > 0 ? data : fallback;

  return (
    <section id="transport" className="py-24 bg-secondary/40 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <img
              src={transportImg}
              alt="TUBA ALHIJAZ transport vehicles"
              loading="lazy"
              className="rounded-3xl shadow-luxury w-full object-cover aspect-[4/3]"
            />
            <div className="absolute -bottom-6 -right-6 bg-card border border-border rounded-2xl p-5 shadow-elevated">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-sunset flex items-center justify-center">
                  <Bus className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-heading text-2xl font-bold">24/7</div>
                  <div className="text-xs text-muted-foreground">{isBn ? "যেকোনো সময়" : "Available anytime"}</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block text-primary text-xs font-bold tracking-[0.3em] uppercase mb-3">
              {isBn ? "ট্রান্সপোর্ট" : "Transport Service"}
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-5 leading-tight">
              {isBn ? "আরামদায়ক যাতায়াত " : "Comfortable rides "}
              <span className="italic text-gradient-sunset">
                {isBn ? "সর্বত্র" : "across Hijaz"}
              </span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              {isBn
                ? "জেদ্দা এয়ারপোর্ট থেকে হোটেল, মক্কা–মদিনা ট্রান্সফার ও জিয়ারাহ ট্যুর — আধুনিক সেডান, এসইউভি, হায়েস ও কোস্টার।"
                : "Airport pickups, intercity Makkah–Madinah transfers and full Ziyarah tours in modern Sedans, SUVs, Hiace vans and Coasters."}
            </p>

            <div className="space-y-3 mb-8">
              {services.slice(0, 4).map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/40 transition">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-semibold text-sm">{s.vehicle_type}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {s.route_from} → {s.route_to}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading font-bold text-primary">SAR {s.price_sar}</div>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="#contact"
              className="inline-flex items-center gap-2 bg-gradient-sunset text-white font-semibold px-7 py-3.5 rounded-full shadow-gold hover:shadow-glow transition-all hover:scale-105"
            >
              {isBn ? "ট্রান্সপোর্ট বুক করুন" : "Book Transport"}
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TransportSection;
