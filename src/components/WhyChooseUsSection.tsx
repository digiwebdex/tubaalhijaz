import { motion } from "framer-motion";
import { ShieldCheck, MapPin, Headphones, Hotel, BadgeDollarSign, Globe2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const COPY = {
  en: {
    label: "WHY TUBA ALHIJAZ",
    heading: "Trusted by pilgrims",
    headingHighlight: "across the world",
    sub: "Six promises that define every TUBA ALHIJAZ journey.",
    items: [
      { icon: ShieldCheck, title: "Licensed Operator", desc: "Registered Saudi Umrah service provider, fully compliant with the Ministry of Hajj & Umrah." },
      { icon: MapPin,      title: "Makkah-Based Office", desc: "On-the-ground team in the Holy City — instant assistance, no middlemen." },
      { icon: Headphones,  title: "24/7 Multilingual Support", desc: "English, Bangla and Arabic support every hour of your trip." },
      { icon: Hotel,       title: "Direct Hotel Contracts", desc: "Long-term contracts with 2★ to 5★ hotels in Makkah, Madinah and Jeddah." },
      { icon: BadgeDollarSign, title: "Transparent Pricing", desc: "All-inclusive quotes — no hidden surcharges, no surprise add-ons." },
      { icon: Globe2,      title: "Global Agent Network", desc: "Partnerships with travel agents in Bangladesh, Malaysia, Indonesia and beyond." },
    ],
  },
  bn: {
    label: "কেন তুবা আলহিজাজ",
    heading: "হাজীদের আস্থার নাম",
    headingHighlight: "বিশ্বজুড়ে",
    sub: "ছয়টি প্রতিশ্রুতি — প্রতিটি যাত্রায় নিশ্চিত।",
    items: [
      { icon: ShieldCheck, title: "লাইসেন্সপ্রাপ্ত", desc: "মন্ত্রণালয় অনুমোদিত সৌদি উমরাহ সেবা প্রদানকারী।" },
      { icon: MapPin,      title: "মক্কাভিত্তিক অফিস", desc: "পবিত্র নগরীতে আমাদের নিজস্ব টিম — দ্রুত সহায়তা।" },
      { icon: Headphones,  title: "২৪/৭ মাল্টিলিঙ্গুয়াল সাপোর্ট", desc: "ইংরেজি, বাংলা ও আরবি — সবসময়।" },
      { icon: Hotel,       title: "সরাসরি হোটেল চুক্তি", desc: "মক্কা, মদিনা ও জেদ্দার ২★ থেকে ৫★ হোটেল।" },
      { icon: BadgeDollarSign, title: "স্বচ্ছ মূল্য", desc: "সব কিছু সহ মূল্য — কোনো গোপন চার্জ নেই।" },
      { icon: Globe2,      title: "গ্লোবাল এজেন্ট নেটওয়ার্ক", desc: "বাংলাদেশ, মালয়েশিয়া, ইন্দোনেশিয়াসহ বিশ্বজুড়ে।" },
    ],
  },
};

const WhyChooseUsSection = () => {
  const { language } = useLanguage();
  const t = COPY[language === "bn" ? "bn" : "en"];

  return (
    <section id="why-us" className="py-24 bg-secondary/40 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-block text-primary text-xs font-bold tracking-[0.3em] uppercase mb-3">{t.label}</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold leading-tight mb-4">
            {t.heading} <span className="text-gradient-gold italic">{t.headingHighlight}</span>
          </h2>
          <p className="text-muted-foreground">{t.sub}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {t.items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-elevated transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <item.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-heading text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
