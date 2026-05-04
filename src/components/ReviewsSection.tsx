import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export type Review = {
  name: string;
  location: { en: string; bn: string };
  rating: number;
  service: { en: string; bn: string };
  comment: { en: string; bn: string };
  initial?: string;
  color?: string;
};

const defaultReviews: Review[] = [
  {
    name: "Abdullah Rahman",
    location: { en: "Dhaka, Bangladesh", bn: "ঢাকা, বাংলাদেশ" },
    rating: 5,
    service: { en: "Jeddah → Makkah Transfer", bn: "জেদ্দা → মক্কা ট্রান্সফার" },
    comment: {
      en: "Driver was waiting at the airport with a name board. Brand new GMC, ice-cold AC, smooth ride straight to our hotel near the Haram. Couldn't ask for a better start to Umrah.",
      bn: "ড্রাইভার নাম-বোর্ড নিয়ে এয়ারপোর্টে অপেক্ষা করছিলেন। একদম নতুন GMC, ঠাণ্ডা AC, হারামের কাছাকাছি হোটেলে সরাসরি স্মুথ যাত্রা।",
    },
    initial: "A",
    color: "from-amber-500 to-orange-600",
  },
  {
    name: "Fatima Al-Mansouri",
    location: { en: "Riyadh, KSA", bn: "রিয়াদ, সৌদি আরব" },
    rating: 5,
    service: { en: "Madinah Ziyarat Tour", bn: "মদিনা জিয়ারত ট্যুর" },
    comment: {
      en: "Knowledgeable guide, comfortable Hiace and on-time pickup. Visited every important site without rush. Family loved it — booking again next month.",
      bn: "জ্ঞানী গাইড, আরামদায়ক হায়েস এবং নির্দিষ্ট সময়ে পিকআপ। প্রতিটি গুরুত্বপূর্ণ স্থান অবসরে ঘুরেছি।",
    },
    initial: "F",
    color: "from-rose-500 to-pink-600",
  },
  {
    name: "Mohammed Hossain",
    location: { en: "Sylhet, Bangladesh", bn: "সিলেট, বাংলাদেশ" },
    rating: 5,
    service: { en: "Group Coach 50-Seater", bn: "গ্রুপ কোচ ৫০-সিটার" },
    comment: {
      en: "Travelled with 42 family members from Madinah to Makkah. The bus was spotless, driver was respectful and price was the most competitive in the market.",
      bn: "৪২ জন পরিবার নিয়ে মদিনা থেকে মক্কা গিয়েছি। বাস ছিল ঝকঝকে, চালক ছিলেন ভদ্র এবং দাম মার্কেটে সবচেয়ে কম।",
    },
    initial: "M",
    color: "from-emerald-500 to-teal-600",
  },
  {
    name: "Yusuf Khan",
    location: { en: "London, UK", bn: "লন্ডন, যুক্তরাজ্য" },
    rating: 5,
    service: { en: "Private SUV — 7 days", bn: "প্রাইভেট SUV — ৭ দিন" },
    comment: {
      en: "Booked a private SUV for the whole week. Driver was on call 24/7 and helped us with luggage everywhere. Felt like having a personal chauffeur — truly premium service.",
      bn: "পুরো সপ্তাহের জন্য প্রাইভেট SUV বুক করেছিলাম। ড্রাইভার ২৪/৭ অন-কল ছিলেন। প্রিমিয়াম সার্ভিস।",
    },
    initial: "Y",
    color: "from-violet-500 to-purple-600",
  },
  {
    name: "Aisha Begum",
    location: { en: "Chattogram, Bangladesh", bn: "চট্টগ্রাম, বাংলাদেশ" },
    rating: 5,
    service: { en: "Airport Pickup — Sedan", bn: "এয়ারপোর্ট পিকআপ — সেডান" },
    comment: {
      en: "Booked online in 2 minutes, got WhatsApp confirmation instantly. Driver called when our flight landed. Honest, transparent and very polite team.",
      bn: "অনলাইনে ২ মিনিটে বুক করেছি, সাথে সাথে WhatsApp কনফার্মেশন। সৎ, স্বচ্ছ ও বিনয়ী টিম।",
    },
    initial: "A",
    color: "from-sky-500 to-blue-600",
  },
  {
    name: "Ibrahim Ali",
    location: { en: "New York, USA", bn: "নিউইয়র্ক, যুক্তরাষ্ট্র" },
    rating: 5,
    service: { en: "Coaster — 20 pax tour", bn: "কোস্টার — ২০ জন ট্যুর" },
    comment: {
      en: "Used TUBA for our entire group's transport during 10-day Umrah. Punctual, clean, fair price. WhatsApp updates kept us informed for every pickup.",
      bn: "১০ দিনের উমরাহতে আমাদের পুরো গ্রুপের ট্রান্সপোর্টের জন্য TUBA ব্যবহার করেছি। সময়ানুবর্তী, পরিষ্কার, ন্যায্য মূল্য।",
    },
    initial: "I",
    color: "from-indigo-500 to-blue-700",
  },
];

interface Props {
  reviews?: Review[];
  title?: { en: string; bn: string };
}

export default function ReviewsSection({ reviews = defaultReviews, title }: Props) {
  const { language } = useLanguage();
  const isBn = language === "bn";

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <section className="py-20 bg-secondary/30 relative overflow-hidden">
      <div className="absolute top-10 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 text-primary text-xs font-bold tracking-[0.3em] uppercase">
            <Star className="h-3.5 w-3.5 fill-current" />
            {isBn ? "রিভিউ" : "Reviews"}
          </span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mt-2 mb-4">
            {isBn ? (title?.bn ?? "যাত্রীদের কথা") : (title?.en ?? "What our pilgrims say")}
          </h2>

          {/* Aggregate */}
          <div className="inline-flex items-center gap-3 rounded-full bg-card border border-border px-5 py-2.5 shadow-elevated">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-primary text-primary" />
              ))}
            </div>
            <div className="text-left">
              <div className="font-heading text-xl font-bold tabular-nums leading-none">{avgRating}/5</div>
              <div className="text-[11px] text-muted-foreground">
                {reviews.length}+ {isBn ? "যাচাইকৃত রিভিউ" : "verified reviews"}
              </div>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -6 }}
              className="group relative bg-card border border-border rounded-2xl p-6 shadow-card hover:shadow-luxury hover:border-primary/40 transition-all"
            >
              <Quote className="absolute top-4 right-4 h-12 w-12 text-primary/10 group-hover:text-primary/20 transition-colors" />

              {/* Rating */}
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`h-4 w-4 ${j < r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>

              {/* Service tag */}
              <div className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-semibold mb-3">
                {isBn ? r.service.bn : r.service.en}
              </div>

              {/* Comment */}
              <p className="text-sm text-foreground/85 leading-relaxed mb-5 relative z-10">
                "{isBn ? r.comment.bn : r.comment.en}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div
                  className={`h-11 w-11 rounded-full bg-gradient-to-br ${r.color || "from-primary to-accent"} flex items-center justify-center text-white font-bold text-lg shadow-md`}
                >
                  {r.initial || r.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {isBn ? r.location.bn : r.location.en}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
