import { motion } from "framer-motion";
import { Car, MapPin, Navigation, Clock, Users, Shield, Star, Phone } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useEffect, useState } from "react";

/**
 * LiveTransportSection
 * - Interactive animated map showing live car services moving
 *   between Makkah, Madinah, Jeddah, Taif, and Mina.
 * - Pure SVG + framer-motion (no external map dependency).
 */

const CITIES = [
  { code: "MAK", en: "Makkah",  bn: "মক্কা",   x: 320, y: 280 },
  { code: "JED", en: "Jeddah",  bn: "জেদ্দা",  x: 140, y: 250 },
  { code: "MED", en: "Madinah", bn: "মদিনা",   x: 420, y: 90  },
  { code: "TAI", en: "Taif",    bn: "তায়েফ",  x: 470, y: 340 },
  { code: "MIN", en: "Mina",    bn: "মিনা",    x: 380, y: 260 },
];

type Route = { from: number; to: number; label: string; eta: string; type: string };

const ROUTES: Route[] = [
  { from: 1, to: 0, label: "Jeddah → Makkah",  eta: "1h 10m", type: "GMC" },
  { from: 0, to: 2, label: "Makkah → Madinah", eta: "4h 30m", type: "Hiace" },
  { from: 0, to: 3, label: "Makkah → Taif",    eta: "1h 30m", type: "GMC" },
  { from: 0, to: 4, label: "Makkah → Mina",    eta: "20m",    type: "Coaster" },
  { from: 2, to: 0, label: "Madinah → Makkah", eta: "4h 30m", type: "Hiace" },
];

const arc = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2 - Math.abs(b.x - a.x) * 0.15 - 30;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
};

const LiveTransportSection = () => {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3500);
    return () => clearInterval(id);
  }, []);

  const liveTrips = 12 + (tick % 7);
  const driversOnline = 28 + (tick % 5);

  const stats = [
    { icon: Car,    value: liveTrips.toString(),     label: isBn ? "চলমান ট্রিপ" : "Live Trips" },
    { icon: Users,  value: driversOnline.toString(), label: isBn ? "অনলাইন ড্রাইভার" : "Drivers Online" },
    { icon: Shield, value: "100%",                   label: isBn ? "লাইসেন্সড" : "Licensed" },
    { icon: Star,   value: "4.9",                    label: isBn ? "রেটিং" : "Rating" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-brand py-16 md:py-24">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-accent/40 blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 mb-4"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-white text-xs font-semibold tracking-wide">
              {isBn ? "লাইভ ট্রান্সপোর্ট নেটওয়ার্ক" : "Live Transport Network"}
            </span>
          </motion.div>
          <h3 className="text-white font-heading text-3xl md:text-5xl font-bold mb-3">
            {isBn ? "রিয়েল-টাইম গাড়ি সেবা" : "Real-Time Car Services"}
          </h3>
          <p className="text-white/85 text-base md:text-lg max-w-2xl mx-auto">
            {isBn
              ? "মক্কা, মদিনা, জেদ্দা, তায়েফ ও মিনার মধ্যে আমাদের লাইসেন্সড গাড়ি সর্বদা চলমান।"
              : "Our licensed fleet runs around the clock between Makkah, Madinah, Jeddah, Taif and Mina."}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-5xl mx-auto bg-[hsl(var(--teal-dark))]/40 backdrop-blur-sm border border-white/15 rounded-3xl overflow-hidden shadow-2xl"
        >
          <svg
            viewBox="0 0 600 420"
            className="w-full h-auto block min-h-[360px] md:min-h-[460px]"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <radialGradient id="ltBg" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="hsl(var(--teal))" stopOpacity="0.45" />
                <stop offset="100%" stopColor="hsl(var(--teal-dark))" stopOpacity="0.9" />
              </radialGradient>
              <linearGradient id="ltRoute" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity="0.15" />
                <stop offset="50%" stopColor="hsl(var(--gold))" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0.15" />
              </linearGradient>
              <filter id="ltGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <rect width="600" height="420" fill="url(#ltBg)" />

            {/* Subtle grid */}
            <g stroke="hsl(var(--gold))" strokeOpacity="0.07" strokeWidth="0.5">
              {Array.from({ length: 11 }).map((_, i) => (
                <line key={`v${i}`} x1={(i + 1) * 50} y1={0} x2={(i + 1) * 50} y2={420} />
              ))}
              {Array.from({ length: 7 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={(i + 1) * 50} x2={600} y2={(i + 1) * 50} />
              ))}
            </g>

            {/* Stylized desert silhouette */}
            <path
              d="M 0 360 Q 100 320 200 345 T 400 350 T 600 335 L 600 420 L 0 420 Z"
              fill="hsl(var(--gold))"
              fillOpacity="0.08"
            />

            {/* Routes */}
            {ROUTES.map((r, i) => {
              const a = CITIES[r.from];
              const b = CITIES[r.to];
              const d = arc(a, b);
              const dur = 6 + (i % 4);
              return (
                <g key={`r${i}`}>
                  <path d={d} fill="none" stroke="url(#ltRoute)" strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray="4 5" />
                  <g filter="url(#ltGlow)">
                    {/* Car body */}
                    <g>
                      <rect x="-9" y="-4" width="18" height="8" rx="2" fill="hsl(var(--gold))" stroke="white" strokeWidth="0.8" />
                      <rect x="-6" y="-6" width="12" height="3" rx="1" fill="white" fillOpacity="0.85" />
                      <circle cx="-5" cy="4" r="1.6" fill="hsl(var(--teal-dark))" />
                      <circle cx="5"  cy="4" r="1.6" fill="hsl(var(--teal-dark))" />
                      <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${i * 0.8}s`} path={d} rotate="auto" />
                    </g>
                  </g>
                </g>
              );
            })}

            {/* City markers */}
            {CITIES.map((c) => (
              <g key={c.code}>
                <circle cx={c.x} cy={c.y} r="5" fill="hsl(var(--gold))" opacity="0.7">
                  <animate attributeName="r" values="5;14;5" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle cx={c.x} cy={c.y} r="4.5" fill="white" stroke="hsl(var(--gold))" strokeWidth="2" />
                <text
                  x={c.x}
                  y={c.y - 12}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill="white"
                  style={{ paintOrder: "stroke", stroke: "hsl(var(--teal-dark))", strokeWidth: 2.5 }}
                >
                  {isBn ? c.bn : c.en}
                </text>
              </g>
            ))}
          </svg>

          {/* Live trip ticker */}
          <div className="bg-[hsl(var(--teal-dark))]/70 border-t border-white/10 px-4 py-3">
            <div className="flex flex-wrap justify-center gap-2">
              {ROUTES.slice(0, 4).map((r, i) => (
                <motion.div
                  key={`tick${i}-${tick}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-[11px] md:text-xs text-white"
                >
                  <Navigation className="h-3 w-3 text-[hsl(var(--gold))]" />
                  <span className="font-semibold">{r.label}</span>
                  <span className="text-white/60">·</span>
                  <span className="text-white/80">{r.type}</span>
                  <span className="text-white/60">·</span>
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">{r.eta}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto mt-6"
        >
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                whileHover={{ y: -4, scale: 1.03 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-sunset flex items-center justify-center shadow-gold">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-white font-extrabold text-xl md:text-2xl leading-none tabular-nums">
                    {s.value}
                  </div>
                  <div className="text-white/70 text-[11px] md:text-xs mt-0.5">{s.label}</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <div className="text-center mt-8">
          <a
            href="#transport"
            className="inline-flex items-center gap-2 bg-white text-accent font-bold px-7 py-3.5 rounded-full shadow-elevated hover:scale-105 transition-transform"
          >
            <Car className="h-4 w-4" />
            {isBn ? "এখনই গাড়ি বুক করুন" : "Book a Car Now"}
          </a>
        </div>
      </div>
    </section>
  );
};

export default LiveTransportSection;
