import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

// Coordinates tuned for a 1100x500 viewBox — looks like a stylized world map
const ORIGIN = { x: 760, y: 260, label: "Bangladesh", labelBn: "বাংলাদেশ", sub: "ORIGIN HUB" };
const DESTINATIONS = [
  { x: 555, y: 215, label: "Saudi Arabia", labelBn: "সৌদি আরব", flag: "🇸🇦" },
  { x: 605, y: 250, label: "UAE", labelBn: "দুবাই", flag: "🇦🇪" },
  { x: 525, y: 175, label: "Turkey", labelBn: "তুরস্ক", flag: "🇹🇷" },
  { x: 855, y: 340, label: "Malaysia", labelBn: "মালয়েশিয়া", flag: "🇲🇾" },
  { x: 905, y: 380, label: "Singapore", labelBn: "সিঙ্গাপুর", flag: "🇸🇬" },
  { x: 470, y: 145, label: "UK", labelBn: "যুক্তরাজ্য", flag: "🇬🇧" },
  { x: 270, y: 145, label: "Canada", labelBn: "কানাডা", flag: "🇨🇦" },
  { x: 940, y: 200, label: "Japan", labelBn: "জাপান", flag: "🇯🇵" },
  { x: 410, y: 175, label: "Germany", labelBn: "জার্মানি", flag: "🇩🇪" },
];

// Stylized continent shapes — rough rectangles to mask dot grid
const CONTINENTS: { x: number; y: number; w: number; h: number }[] = [
  // North America
  { x: 90, y: 110, w: 240, h: 160 },
  // South America
  { x: 230, y: 280, w: 110, h: 150 },
  // Europe
  { x: 400, y: 110, w: 130, h: 110 },
  // Africa
  { x: 430, y: 220, w: 150, h: 200 },
  // Middle East
  { x: 540, y: 180, w: 110, h: 100 },
  // Russia / North Asia
  { x: 540, y: 80, w: 360, h: 90 },
  // South Asia
  { x: 680, y: 200, w: 110, h: 90 },
  // SE Asia
  { x: 790, y: 270, w: 110, h: 90 },
  // East Asia
  { x: 830, y: 150, w: 130, h: 110 },
  // Oceania
  { x: 880, y: 360, w: 130, h: 70 },
];

// Generate dense dot grid only inside continent rects with edge softening
const generateMapDots = () => {
  const dots: { x: number; y: number; opacity: number }[] = [];
  const step = 9;
  for (let y = 70; y < 440; y += step) {
    for (let x = 80; x < 1020; x += step) {
      // Check membership in any continent rect with soft edges
      let bestStrength = 0;
      for (const c of CONTINENTS) {
        if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          const dx = Math.min(x - c.x, c.x + c.w - x) / (c.w / 2);
          const dy = Math.min(y - c.y, c.y + c.h - y) / (c.h / 2);
          const edge = Math.min(dx, dy);
          const strength = Math.min(1, edge * 1.6);
          if (strength > bestStrength) bestStrength = strength;
        }
      }
      if (bestStrength > 0.05) {
        // Slight randomness for organic feel
        if (Math.random() < 0.92) {
          dots.push({ x, y, opacity: 0.35 + bestStrength * 0.55 });
        }
      }
    }
  }
  return dots;
};

const MAP_DOTS = generateMapDots();

// Smooth quadratic Bezier curve between two points
const curvePath = (x1: number, y1: number, x2: number, y2: number) => {
  const mx = (x1 + x2) / 2;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const my = (y1 + y2) / 2 - dist * 0.28;
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
};

// Approximate point on quadratic curve at parameter t (0..1)
const pointOnCurve = (x1: number, y1: number, x2: number, y2: number, t: number) => {
  const mx = (x1 + x2) / 2;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const my = (y1 + y2) / 2 - dist * 0.28;
  const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
  const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
  return { x, y };
};

const AnimatedWorldMap = () => {
  const { language } = useLanguage();

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Status pill */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-primary/30 px-3 py-1.5 rounded-full text-[10px] md:text-xs text-white font-bold tracking-[0.15em] uppercase shadow-lg"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        TUBA ALHIJAZ • {DESTINATIONS.length} {language === "bn" ? "একটিভ রুট" : "ACTIVE ROUTES"}
      </motion.div>

      {/* Decorative corner brackets */}
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/40 rounded-tr-lg pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/40 rounded-bl-lg pointer-events-none" />

      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(192,80%,8%)] via-[hsl(195,70%,11%)] to-[hsl(188,75%,12%)] border border-white/10 shadow-2xl p-4 md:p-6">
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(38,90%,60%) 1px, transparent 1px), linear-gradient(90deg, hsl(38,90%,60%) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <svg
          viewBox="0 0 1100 500"
          className="w-full h-auto relative z-10"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Route gradient — gold, fading on edges */}
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(38, 95%, 65%)" stopOpacity="0" />
              <stop offset="40%" stopColor="hsl(38, 95%, 65%)" stopOpacity="0.95" />
              <stop offset="60%" stopColor="hsl(42, 100%, 70%)" stopOpacity="1" />
              <stop offset="100%" stopColor="hsl(38, 95%, 65%)" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(38, 100%, 65%)" stopOpacity="0.85" />
              <stop offset="40%" stopColor="hsl(38, 100%, 60%)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(38, 100%, 60%)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="destGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(188, 100%, 70%)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(188, 100%, 70%)" stopOpacity="0" />
            </radialGradient>
            <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Continent dots — bright cyan/teal, dense */}
          <g>
            {MAP_DOTS.map((d, i) => (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r="1.6"
                fill="hsl(188, 75%, 60%)"
                opacity={d.opacity}
              />
            ))}
          </g>

          {/* Static faint route lines */}
          {DESTINATIONS.map((dest, i) => (
            <path
              key={`base-${i}`}
              d={curvePath(ORIGIN.x, ORIGIN.y, dest.x, dest.y)}
              stroke="hsl(38, 90%, 65%)"
              strokeWidth="1"
              strokeDasharray="2 5"
              fill="none"
              opacity="0.35"
            />
          ))}

          {/* Animated traveling glow on each route */}
          {DESTINATIONS.map((dest, i) => {
            const path = curvePath(ORIGIN.x, ORIGIN.y, dest.x, dest.y);
            return (
              <motion.path
                key={`route-${i}`}
                d={path}
                stroke="url(#routeGrad)"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
                strokeDasharray="80 600"
                filter="url(#goldGlow)"
                initial={{ strokeDashoffset: 680 }}
                animate={{ strokeDashoffset: -80 }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "linear",
                }}
              />
            );
          })}

          {/* Travelling plane icons along routes */}
          {DESTINATIONS.map((dest, i) => {
            // plane position animates via SVG animateMotion
            const path = curvePath(ORIGIN.x, ORIGIN.y, dest.x, dest.y);
            return (
              <g key={`plane-${i}`}>
                <circle r="2.5" fill="hsl(42, 100%, 70%)" filter="url(#goldGlow)">
                  <animateMotion dur="3.5s" begin={`${i * 0.4}s`} repeatCount="indefinite" path={path} />
                </circle>
              </g>
            );
          })}

          {/* Destination markers */}
          {DESTINATIONS.map((dest, i) => (
            <motion.g
              key={`dest-${i}`}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.08, type: "spring", damping: 14 }}
            >
              {/* Soft aura */}
              <circle cx={dest.x} cy={dest.y} r="22" fill="url(#destGlow)" />
              {/* Pulse ring */}
              <circle cx={dest.x} cy={dest.y} r="6" fill="none" stroke="hsl(188, 90%, 65%)" strokeWidth="1.5" opacity="0.7">
                <animate attributeName="r" values="5;16;5" dur="2.4s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
              </circle>
              {/* Marker dot */}
              <circle cx={dest.x} cy={dest.y} r="5" fill="hsl(188, 95%, 55%)" stroke="white" strokeWidth="1.8" />
              <circle cx={dest.x} cy={dest.y} r="2" fill="white" />
              {/* Label background pill */}
              <rect
                x={dest.x - (language === "bn" ? dest.labelBn.length * 4 + 8 : dest.label.length * 3.6 + 8)}
                y={dest.y - 28}
                width={(language === "bn" ? dest.labelBn.length * 8 + 16 : dest.label.length * 7.2 + 16)}
                height="16"
                rx="8"
                fill="rgba(0,0,0,0.55)"
                stroke="hsl(188, 80%, 50%)"
                strokeOpacity="0.4"
                strokeWidth="0.8"
              />
              <text
                x={dest.x}
                y={dest.y - 17}
                fill="white"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                letterSpacing="0.3"
              >
                {language === "bn" ? dest.labelBn : dest.label}
              </text>
            </motion.g>
          ))}

          {/* Origin Hub — Bangladesh — most prominent */}
          <g>
            {/* Outer halo */}
            <circle cx={ORIGIN.x} cy={ORIGIN.y} r="80" fill="url(#hubGlow)">
              <animate attributeName="r" values="65;90;65" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
            </circle>

            {/* Pulse rings */}
            {[0, 1, 2].map((idx) => (
              <circle
                key={`pulse-${idx}`}
                cx={ORIGIN.x}
                cy={ORIGIN.y}
                r="10"
                fill="none"
                stroke="hsl(38, 100%, 65%)"
                strokeWidth="2"
                opacity="0"
              >
                <animate attributeName="r" values="10;55;10" dur="3s" begin={`${idx}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.95;0;0.95" dur="3s" begin={`${idx}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Solid core */}
            <circle cx={ORIGIN.x} cy={ORIGIN.y} r="11" fill="hsl(38, 100%, 60%)" filter="url(#goldGlow)" />
            <circle cx={ORIGIN.x} cy={ORIGIN.y} r="5" fill="white" />

            {/* Label pill */}
            <rect
              x={ORIGIN.x - 60}
              y={ORIGIN.y + 22}
              width="120"
              height="36"
              rx="10"
              fill="rgba(0,0,0,0.65)"
              stroke="hsl(38, 100%, 60%)"
              strokeWidth="1"
            />
            <text
              x={ORIGIN.x}
              y={ORIGIN.y + 38}
              fill="hsl(38, 100%, 65%)"
              fontSize="14"
              fontWeight="900"
              textAnchor="middle"
              letterSpacing="1.5"
            >
              {language === "bn" ? "বাংলাদেশ" : "BANGLADESH"}
            </text>
            <text
              x={ORIGIN.x}
              y={ORIGIN.y + 51}
              fill="white"
              fontSize="8"
              fontWeight="700"
              textAnchor="middle"
              letterSpacing="2.5"
              opacity="0.75"
            >
              {ORIGIN.sub}
            </text>
          </g>
        </svg>
      </div>

      {/* Country flag chips */}
      <div className="flex flex-wrap justify-center gap-2 mt-5 px-2">
        {DESTINATIONS.map((d, i) => (
          <motion.span
            key={d.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 + i * 0.05 }}
            className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-primary/30 hover:border-primary transition-all hover:scale-105"
          >
            <span className="text-base leading-none">{d.flag}</span>
            {language === "bn" ? d.labelBn : d.label}
          </motion.span>
        ))}
      </div>
    </div>
  );
};

export default AnimatedWorldMap;
