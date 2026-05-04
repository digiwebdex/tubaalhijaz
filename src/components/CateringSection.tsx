import { motion } from "framer-motion";
import { UtensilsCrossed, Coffee, Soup, ArrowRight } from "lucide-react";
import cateringImg from "@/assets/tuba-catering.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/api";

const fallback = [
  { name: "Breakfast Plan", meal_type: "Breakfast", cuisine: "Arabic + Bangladeshi", price_per_meal: 18, Icon: Coffee },
  { name: "Lunch Plan", meal_type: "Lunch", cuisine: "Bangladeshi Biryani", price_per_meal: 28, Icon: Soup },
  { name: "Dinner Plan", meal_type: "Dinner", cuisine: "Arabic Kabsa & Bangla", price_per_meal: 28, Icon: UtensilsCrossed },
];

const icons: Record<string, any> = { Breakfast: Coffee, Lunch: Soup, Dinner: UtensilsCrossed };

const CateringSection = () => {
  const { language } = useLanguage();
  const isBn = language === "bn";

  const { data } = useQuery({
    queryKey: ["catering_packages_public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("catering_packages")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_website", true)
        .order("display_order", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const packages = data && data.length > 0 ? data : fallback;

  return (
    <section id="catering" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-block text-primary text-xs font-bold tracking-[0.3em] uppercase mb-3">
            {isBn ? "ক্যাটারিং" : "Catering Service"}
          </span>
          <h2 className="font-heading text-4xl md:text-6xl font-bold mb-4 leading-tight">
            {isBn ? "ঘরের স্বাদ " : "A taste of home, "}
            <span className="italic text-gradient-sunset">
              {isBn ? "মক্কায়" : "in Makkah"}
            </span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            {isBn
              ? "বিশুদ্ধ হালাল বাংলা ও আরবী খাবার — প্রতিদিন আপনার হোটেলে পৌঁছে দেওয়া হবে।"
              : "100% Halal Bangladeshi & Arabic meals delivered fresh to your hotel — every single day."}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <img
              src={cateringImg}
              alt="Halal meals catered by TUBA ALHIJAZ"
              loading="lazy"
              className="rounded-3xl shadow-luxury w-full object-cover aspect-[4/3]"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {packages.slice(0, 3).map((p: any, i: number) => {
              const Icon = icons[p.meal_type] || UtensilsCrossed;
              return (
                <div key={i} className="flex items-center gap-5 p-5 bg-card rounded-2xl border border-border hover:border-primary/40 hover:shadow-luxury transition group">
                  <div className="w-14 h-14 rounded-xl bg-gradient-sunset flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-xl font-bold">{p.name || p.meal_type}</h3>
                    <p className="text-sm text-muted-foreground">{p.cuisine}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-heading font-bold text-primary text-xl">SAR {p.price_per_meal}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{isBn ? "প্রতি মিল" : "per meal"}</div>
                  </div>
                </div>
              );
            })}

            <a
              href="#contact"
              className="inline-flex items-center gap-2 mt-4 bg-gradient-sunset text-white font-semibold px-7 py-3.5 rounded-full shadow-gold hover:shadow-glow transition-all hover:scale-105"
            >
              {isBn ? "ক্যাটারিং অর্ডার করুন" : "Order Catering"}
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CateringSection;
