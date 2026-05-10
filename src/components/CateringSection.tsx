import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import breakfastImg from "@/assets/category-breakfast.jpg";
import lunchImg from "@/assets/category-lunch.jpg";
import dinnerImg from "@/assets/category-dinner.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import CateringOrderDialog, { CateringPlan } from "./CateringOrderDialog";

const categoryImages: Record<string, string> = {
  Breakfast: breakfastImg,
  Lunch: lunchImg,
  Dinner: dinnerImg,
};
const categoryLabelsBn: Record<string, string> = {
  Breakfast: "সকালের নাস্তা",
  Lunch: "দুপুরের খাবার",
  Dinner: "রাতের খাবার",
};

const fallback: CateringPlan[] = [
  { name: "Breakfast Plan", meal_type: "Breakfast", cuisine: "Arabic + Bangladeshi", price_per_meal: 18 },
  { name: "Lunch Plan", meal_type: "Lunch", cuisine: "Bangladeshi Biryani", price_per_meal: 28 },
  { name: "Dinner Plan", meal_type: "Dinner", cuisine: "Arabic Kabsa & Bangla", price_per_meal: 28 },
];

const CateringSection = () => {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const [selected, setSelected] = useState<CateringPlan | null>(null);

  const { data } = useQuery({
    queryKey: ["catering_packages_public"],
    queryFn: async () => {
      const { data } = await apiClient
        .from("catering_packages")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_website", true)
        .order("display_order", { ascending: true });
      return (data as any[]) || [];
    },
  });

  const packages = (data && data.length > 0 ? data : fallback).slice(0, 3);

  const handleClick = (p: any) => {
    const meal = p.meal_type as keyof typeof categoryImages;
    setSelected({
      id: p.id,
      name: p.name || `${meal} Plan`,
      meal_type: meal,
      cuisine: p.cuisine,
      price_per_meal: Number(p.price_per_meal) || 0,
      image: categoryImages[meal],
    });
  };

  return (
    <section id="catering" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />

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
          <p className="mt-3 text-sm text-primary font-semibold">
            {isBn ? "কোনো প্ল্যানে ক্লিক করে অর্ডার করুন →" : "Tap any plan to order →"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {packages.map((p: any, idx: number) => {
            const meal = (p.meal_type || "Breakfast") as keyof typeof categoryImages;
            const img = categoryImages[meal] || breakfastImg;
            return (
              <motion.button
                type="button"
                key={p.id || idx}
                onClick={() => handleClick(p)}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -6 }}
                className="group relative text-left rounded-3xl overflow-hidden bg-card border border-border shadow-luxury hover:shadow-glow hover:border-primary/40 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={img}
                    alt={`${meal} — homemade meal by TUBA ALHIJAZ`}
                    loading="lazy"
                    width={1024}
                    height={768}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/90 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      {isBn ? "তাজা · ঘরে তৈরি" : "Fresh · Homemade"}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <h3 className="font-heading text-2xl md:text-3xl font-bold text-white drop-shadow">
                      {isBn ? categoryLabelsBn[meal] : meal}
                    </h3>
                    <div className="text-right">
                      <div className="font-heading text-white text-2xl font-bold leading-none">
                        SAR {p.price_per_meal}
                      </div>
                      <div className="text-[9px] text-white/80 uppercase tracking-widest mt-1">
                        {isBn ? "প্রতি মিল" : "per meal"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <div className="font-semibold text-foreground">{p.name || `${meal} Plan`}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.cuisine}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-primary font-semibold text-sm group-hover:gap-3 transition-all">
                    {isBn ? "অর্ডার" : "Order"}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <CateringOrderDialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        plan={selected}
      />
    </section>
  );
};

export default CateringSection;
