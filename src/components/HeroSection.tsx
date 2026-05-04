import { motion } from "framer-motion";
import { ArrowRight, Phone, Sparkles } from "lucide-react";
import heroKaaba from "@/assets/tuba-hero-kaaba.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const isBn = language === "bn";

  return (
    <section
      id="hero"
      className="relative w-full min-h-[100vh] flex items-center overflow-hidden pt-24"
    >
      <img
        src={heroKaaba}
        alt="Kaaba in Masjid al-Haram, Makkah at golden hour"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
      />

      <div className="absolute inset-0 bg-gradient-hero-overlay" />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/45 to-transparent" />

      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-accent/40 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-primary/40 rounded-full px-4 py-2 mb-6"
          >
            <Sparkles className="h-4 w-4 text-primary-glow" />
            <span className="text-white text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase">
              {isBn ? "মক্কা থেকে আপনার সেবায়" : "Serving you from Makkah"}
            </span>
          </motion.div>

          <p
            className="text-primary-glow text-2xl md:text-3xl mb-3 leading-tight"
            style={{ fontFamily: "var(--font-arabic)", direction: "rtl" }}
          >
            طُوبَى الْحِجَاز
          </p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold text-white leading-[1.05] mb-6"
          >
            {isBn ? (
              <>
                আপনার পবিত্র যাত্রা{" "}
                <span className="text-gradient-sunset italic">মক্কায় শুরু</span>
              </>
            ) : (
              <>
                Your sacred journey{" "}
                <span className="text-gradient-sunset italic">begins in Makkah</span>
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed mb-10"
          >
            {isBn
              ? "TUBA ALHIJAZ — মক্কাভিত্তিক বিশ্বস্ত উমরাহ পার্টনার। ভিসা, হোটেল, ট্রান্সপোর্ট ও ক্যাটারিং — এক ছাদের নিচে।"
              : "TUBA ALHIJAZ is your trusted Makkah-based partner for Umrah Visa, premium hotels, comfortable transport and authentic catering — all under one roof."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-wrap items-center gap-4"
          >
            <button
              onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}
              className="group inline-flex items-center gap-2 bg-gradient-sunset text-white font-semibold px-8 py-4 rounded-full shadow-gold hover:shadow-glow transition-all hover:scale-105"
            >
              {isBn ? "আমাদের সার্ভিস" : "Explore Our Services"}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="tel:+966534919814"
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/40 text-white font-semibold px-8 py-4 rounded-full hover:bg-white/20 transition-all"
            >
              <Phone className="h-4 w-4" />
              +966 53 491 9814
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-14 grid grid-cols-3 gap-6 sm:gap-10 max-w-xl"
          >
            {[
              { n: "4", l: isBn ? "মূল সার্ভিস" : "Core Services" },
              { n: "100%", l: "Halal Tayyib" },
              { n: "24/7", l: isBn ? "সাপোর্ট" : "Support" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums font-heading">{s.n}</div>
                <div className="text-xs sm:text-sm text-white/75 mt-1 tracking-wide">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background pointer-events-none" />
    </section>
  );
};

export default HeroSection;
