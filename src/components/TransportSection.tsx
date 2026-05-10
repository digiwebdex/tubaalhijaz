import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Bus, Car, MapPin, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransportOrderDialog, { TransportService } from "@/components/TransportOrderDialog";
import busImg from "@/assets/transport-bus.jpg";
import coasterImg from "@/assets/transport-coaster.jpg";
import hiaceImg from "@/assets/transport-hiace.jpg";
import suvImg from "@/assets/transport-suv.jpg";
import sedanImg from "@/assets/transport-sedan.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useNavigate } from "react-router-dom";
import { requireCustomerLogin } from "@/lib/bookingAuth";

const collage = [
  { key: "bus", img: busImg, label: { en: "Bus", bn: "বাস" } },
  { key: "coaster", img: coasterImg, label: { en: "Coaster", bn: "কোস্টার" } },
  { key: "hiace", img: hiaceImg, label: { en: "Hiace", bn: "হায়েস" } },
  { key: "suv", img: suvImg, label: { en: "SUV", bn: "এসইউভি" } },
  { key: "sedan", img: sedanImg, label: { en: "Sedan", bn: "সেডান" } },
];

const fallback = [
  { vehicle_type: "Bus (1–50 pax)", route_from: "Jeddah Airport", route_to: "Makkah Hotel", price_sar: 1800 },
  { vehicle_type: "Coaster (1–25 pax)", route_from: "Ziyarah Tour", route_to: "Makkah", price_sar: 1200 },
  { vehicle_type: "Hiace (1–11 pax)", route_from: "Makkah", route_to: "Madinah", price_sar: 850 },
  { vehicle_type: "SUV (1–5 pax)", route_from: "Jeddah Airport", route_to: "Makkah Hotel", price_sar: 380 },
  { vehicle_type: "Sedan (1–3 pax)", route_from: "Jeddah Airport", route_to: "Makkah Hotel", price_sar: 250 },
];

const TransportSection = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isBn = language === "bn";

  const { data } = useQuery({
    queryKey: ["transport_services_public"],
    queryFn: async () => {
      const { data } = await apiClient
        .from("transport_services")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_website", true)
        .order("display_order", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const services = data && data.length > 0 ? data : fallback;
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<TransportService | null>(null);

  const openService = (s: any) => {
    setSelectedService({
      id: s.id,
      vehicle_type: s.vehicle_type,
      route_from: s.route_from,
      route_to: s.route_to,
      price_sar: Number(s.price_sar) || 0,
      capacity: s.capacity,
    });
    setOrderOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("book") !== "transport" || orderOpen) return;
    const serviceName = params.get("service");
    const service = services.find((s: any) => !serviceName || s.vehicle_type === serviceName) || services[0];
    if (!service) return;

    apiClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      openService(service);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash || ""}`);
    });
  }, [services, orderOpen]);

  const benefitsFor = (vt: string) => {
    const t = vt.toLowerCase();
    const common = isBn
      ? ["অভিজ্ঞ ড্রাইভার", "এসি ও পরিচ্ছন্ন গাড়ি", "২৪/৭ সাপোর্ট", "অন-টাইম পিকআপ"]
      : ["Experienced driver", "AC & clean vehicle", "24/7 support", "On-time pickup"];
    if (t.includes("bus")) return [...common, isBn ? "বড় গ্রুপের জন্য আদর্শ (১–৫০ জন)" : "Ideal for large groups (1–50 pax)", isBn ? "বড় লাগেজ স্পেস" : "Spacious luggage area"];
    if (t.includes("coaster")) return [...common, isBn ? "মিড-সাইজ গ্রুপ (১–২৫ জন)" : "Mid-size groups (1–25 pax)", isBn ? "জিয়ারাহ ট্যুরে আরামদায়ক" : "Comfortable for Ziyarah tours"];
    if (t.includes("hiace")) return [...common, isBn ? "পরিবার/ছোট গ্রুপ (১–১১ জন)" : "Family / small group (1–11 pax)", isBn ? "ফ্লেক্সিবল রুট" : "Flexible routing"];
    if (t.includes("suv")) return [...common, isBn ? "প্রিমিয়াম রাইড (১–৫ জন)" : "Premium ride (1–5 pax)", isBn ? "VIP কমফোর্ট" : "VIP comfort"];
    if (t.includes("sedan")) return [...common, isBn ? "প্রাইভেট ট্রান্সফার (১–৩ জন)" : "Private transfer (1–3 pax)", isBn ? "দ্রুত ও নিরিবিলি" : "Fast & private"];
    return common;
  };

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
            <div className="relative rounded-3xl overflow-hidden shadow-luxury aspect-[4/3] bg-secondary">
              {/* Main featured image */}
              <div className="absolute inset-0">
                {collage.map((c, i) => (
                  <motion.img
                    key={c.key}
                    src={c.img}
                    alt={`TUBA ALHIJAZ ${c.label.en}`}
                    loading="lazy"
                    width={1024}
                    height={1024}
                    initial={false}
                    animate={{ opacity: active === i ? 1 : 0, scale: active === i ? 1 : 1.05 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <div className="text-xs tracking-[0.3em] uppercase opacity-80">{isBn ? "ফিচারড" : "Featured"}</div>
                  <div className="font-heading text-3xl font-bold">
                    {isBn ? collage[active].label.bn : collage[active].label.en}
                  </div>
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="absolute top-4 left-4 right-4 grid grid-cols-5 gap-2">
                {collage.map((c, i) => (
                  <button
                    key={c.key}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-label={c.label.en}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      active === i ? "border-primary scale-105 shadow-lg" : "border-white/40 hover:border-white"
                    }`}
                  >
                    <img src={c.img} alt={c.label.en} loading="lazy" className="w-full h-full object-cover" />
                    <div className={`absolute inset-0 ${active === i ? "bg-primary/20" : "bg-black/30 hover:bg-black/0"} transition`} />
                  </button>
                ))}
              </div>
            </div>

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
              {services.slice(0, 5).map((s: any, i: number) => {
                const isOpen = expanded === i;
                return (
                  <div
                    key={i}
                    className={`bg-card rounded-xl border transition ${isOpen ? "border-primary/60 shadow-elevated" : "border-border hover:border-primary/40"}`}
                  >
                    <button
                      type="button"
                      onClick={() => { setExpanded(isOpen ? null : i); setActive(i); }}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
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
                      <div className="flex items-center gap-3">
                        <div className="font-heading font-bold text-primary">SAR {s.price_sar}</div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-border">
                            <ul className="space-y-2 mb-4 mt-3">
                              {benefitsFor(s.vehicle_type).map((b, bi) => (
                                <li key={bi} className="flex items-start gap-2 text-sm">
                                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                            <Button
                              className="w-full"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!(await requireCustomerLogin(navigate, `/?book=transport&service=${encodeURIComponent(s.vehicle_type)}#transport`))) return;
                                openService(s);
                              }}
                            >
                              {isBn ? "বুকিং করুন" : "Book Now"}
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
      <TransportOrderDialog open={orderOpen} onOpenChange={setOrderOpen} service={selectedService} />
    </section>
  );
};

export default TransportSection;
