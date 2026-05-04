import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { useBulkSiteContent } from "@/hooks/useSiteContentProvider";
import { useLanguage } from "@/i18n/LanguageContext";

const defaultTestimonials = [
  {
    name: "Rashed Ahmed",
    location: "Dhaka",
    text: "TUBA ALHIJAZ made our family vacation to the Maldives absolutely seamless. From flights to the overwater villa, every detail was handled perfectly. Highly recommended!",
    rating: 5,
    trip: "Maldives Tour 2025",
  },
  {
    name: "Sanjida Rahman",
    location: "Chattogram",
    text: "Got my Schengen tourist visa approved with zero hassle. Their team guided me through every document. Truly professional service from start to finish.",
    rating: 5,
    trip: "Tourist Visa 2025",
  },
  {
    name: "Mohammad Hasan",
    location: "Sylhet",
    text: "Booked our Umrah package with TUBA ALHIJAZ and the experience was outstanding. Hotels near Haram, smooth transport, and dedicated support throughout the journey.",
    rating: 5,
    trip: "Umrah 2025",
  },
];

const TestimonialsSection = forwardRef<HTMLElement>(function TestimonialsSection(_, ref) {
  const { data: content } = useBulkSiteContent("testimonials");
  const { language } = useLanguage();
  const bn = language === "bn";
  const lc = content?.[language];

  const sectionLabel = lc?.section_label || (bn ? "প্রশংসাপত্র" : "Testimonials");
  const heading = lc?.heading || (bn ? "আমাদের হাজীদের " : "What Our ");
  const headingHighlight = lc?.heading_highlight || (bn ? "মতামত" : "Pilgrims Say");
  const description = lc?.description || (bn ? "আমাদের সন্তুষ্ট গ্রাহকদের মতামত যারা তাদের পবিত্র যাত্রায় আমাদের বিশ্বাস করেছেন" : "Hear from our satisfied customers who trusted us with their sacred journey");

  const testimonials = content?.items || defaultTestimonials;

  return (
    <section ref={ref} className="py-24 bg-secondary/20 relative overflow-hidden">
      <div className="absolute inset-0 islamic-pattern opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-primary text-xs font-semibold tracking-[0.3em] uppercase">{sectionLabel}</span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mt-3 mb-3">
            {heading}<span className="text-gradient-gold">{headingHighlight}</span>
          </h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-primary/30" />
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            <div className="h-px w-12 bg-primary/30" />
          </div>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">{description}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-card border border-border rounded-2xl p-7 relative shadow-soft group hover:shadow-luxury hover:border-primary/20 transition-all"
            >
              {/* Top gold accent on hover */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-t-2xl" />
              
              <Quote className="h-8 w-8 text-primary/15 absolute top-5 right-5" />
              <div className="flex gap-1 mb-4">
                {Array.from({ length: Number(t.rating) || 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed mb-5">
                "{t.text}"
              </p>
              <div className="border-t border-border/50 pt-4">
                <p className="font-heading font-bold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.location} • {t.trip}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

export default TestimonialsSection;
