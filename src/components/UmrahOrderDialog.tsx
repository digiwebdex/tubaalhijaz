import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Check, ArrowRight, ArrowLeft, Loader2, CheckCircle2, MessageCircle, Copy } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { PROGRAMS, type ProgramTier } from "@/components/UmrahProgramsSection";

const inputClass =
  "w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const ROOM_TYPES = ["double", "triple", "quad", "shared"] as const;
const VEHICLES = ["sedan", "suv", "hiace", "coaster", "bus", "none"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// per-traveler add-on prices in SAR
const ADDONS = {
  hotelPerNight: { economic: 90, silver: 150, golden: 240, platinum: 380 },
  vehicle: { sedan: 250, suv: 380, hiace: 850, coaster: 1200, bus: 1500, none: 0 } as Record<string, number>,
  ziyarat: 120,
  reception: 0,   // included
  visa: 350,
};

const formSchema = z.object({
  guest_name: z.string().trim().min(2, "Name is too short").max(120),
  guest_phone: z.string().trim().min(7, "Enter a valid phone number").max(25),
  guest_email: z.string().trim().email("Enter a valid email").max(180).or(z.literal("")),
  num_travelers: z.number().int().min(1).max(50),
  makkah_nights: z.number().int().min(0).max(60),
  madinah_nights: z.number().int().min(0).max(60),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTier?: ProgramTier;
};

const WHATSAPP_NUMBER = "966500000000"; // TODO: replace with real TUBA WhatsApp

const COPY = {
  en: {
    title: "Book your Umrah",
    desc: "5 quick steps. We'll contact you with confirmed pricing.",
    steps: ["Program", "Travelers", "Services", "Contact", "Review"],
    tier: "Program tier",
    travelMonth: "Preferred travel month",
    numTravelers: "Number of travelers",
    roomType: "Room type",
    nightsMakkah: "Nights in Makkah",
    nightsMadinah: "Nights in Madinah",
    services: "Add-on services",
    visa: "Umrah visa processing",
    hotel: "Hotel accommodation",
    transport: "Transport vehicle",
    catering: "Catering package (optional)",
    ziyarat: "Ziyarat tour",
    reception: "Airport reception & farewell",
    name: "Full name",
    phone: "Phone (with country code)",
    email: "Email (optional)",
    passport: "Passport ready",
    requests: "Special requests",
    estimate: "Estimated price",
    submit: "Submit order",
    next: "Next",
    back: "Back",
    successTitle: "Order received!",
    successDesc: "Our team will contact you within 24 hours.",
    tracking: "Your tracking ID",
    copy: "Copy",
    whatsapp: "Chat on WhatsApp",
    close: "Close",
  },
  bn: {
    title: "উমরাহ বুক করুন",
    desc: "৫টি সহজ ধাপ। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।",
    steps: ["প্রোগ্রাম", "ট্রাভেলার", "সার্ভিস", "যোগাযোগ", "রিভিউ"],
    tier: "প্রোগ্রাম",
    travelMonth: "পছন্দের ভ্রমণের মাস",
    numTravelers: "মোট ট্রাভেলার",
    roomType: "রুম টাইপ",
    nightsMakkah: "মক্কায় রাত",
    nightsMadinah: "মদিনায় রাত",
    services: "অ্যাড-অন সার্ভিস",
    visa: "উমরাহ ভিসা",
    hotel: "হোটেল",
    transport: "ট্রান্সপোর্ট ভেহিকল",
    catering: "ক্যাটারিং (ঐচ্ছিক)",
    ziyarat: "জিয়ারাহ ট্যুর",
    reception: "এয়ারপোর্ট রিসেপশন",
    name: "পুরো নাম",
    phone: "ফোন (কান্ট্রি কোড সহ)",
    email: "ইমেইল (ঐচ্ছিক)",
    passport: "পাসপোর্ট প্রস্তুত",
    requests: "বিশেষ অনুরোধ",
    estimate: "আনুমানিক মূল্য",
    submit: "অর্ডার সাবমিট",
    next: "পরবর্তী",
    back: "পূর্ববর্তী",
    successTitle: "অর্ডার গ্রহণ করা হয়েছে!",
    successDesc: "আমাদের টিম ২৪ ঘণ্টার মধ্যে আপনার সাথে যোগাযোগ করবে।",
    tracking: "আপনার ট্র্যাকিং আইডি",
    copy: "কপি",
    whatsapp: "WhatsApp এ চ্যাট",
    close: "বন্ধ",
  },
};

const UmrahOrderDialog = ({ open, onOpenChange, defaultTier = "silver" }: Props) => {
  const { language } = useLanguage();
  const t = COPY[language === "bn" ? "bn" : "en"];

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [cateringPackages, setCateringPackages] = useState<any[]>([]);

  const [form, setForm] = useState({
    program_tier: defaultTier as ProgramTier,
    travel_month: "",
    num_travelers: 2,
    room_type: "triple" as (typeof ROOM_TYPES)[number],
    makkah_nights: 7,
    madinah_nights: 4,
    include_visa: true,
    include_hotel: true,
    transport_vehicle: "hiace" as (typeof VEHICLES)[number],
    catering_package_id: "",
    include_ziyarat: true,
    include_reception: true,
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    passport_ready: false,
    special_requests: "",
  });

  // Reset when reopened with a new tier
  useEffect(() => {
    if (open) {
      setStep(0);
      setTrackingId(null);
      setForm((f) => ({ ...f, program_tier: defaultTier }));
    }
  }, [open, defaultTier]);

  useEffect(() => {
    if (open && cateringPackages.length === 0) {
      apiClient
        .from("catering_packages")
        .select("id,name,meal_type,price_per_meal")
        .eq("is_active", true)
        .then(({ data }) => setCateringPackages(data || []));
    }
  }, [open, cateringPackages.length]);

  const tierMeta = PROGRAMS.find((p) => p.key === form.program_tier)!;

  const estimateSAR = useMemo(() => {
    const base = tierMeta.basePriceSAR * form.num_travelers;
    const hotel = form.include_hotel
      ? ADDONS.hotelPerNight[form.program_tier] * (form.makkah_nights + form.madinah_nights) * form.num_travelers
      : 0;
    const visa = form.include_visa ? ADDONS.visa * form.num_travelers : 0;
    const transport = ADDONS.vehicle[form.transport_vehicle] || 0;
    const ziyarat = form.include_ziyarat ? ADDONS.ziyarat * form.num_travelers : 0;
    const cateringPkg = cateringPackages.find((p) => p.id === form.catering_package_id);
    const catering = cateringPkg
      ? Number(cateringPkg.price_per_meal) * form.num_travelers * (form.makkah_nights + form.madinah_nights)
      : 0;
    return Math.round(base + hotel + visa + transport + ziyarat + catering);
  }, [form, tierMeta, cateringPackages]);

  const estimateBDT = Math.round(estimateSAR * 32); // approx SAR→BDT

  const stepValid = (s: number) => {
    if (s === 3) {
      const r = formSchema.safeParse({
        guest_name: form.guest_name,
        guest_phone: form.guest_phone,
        guest_email: form.guest_email || "",
        num_travelers: form.num_travelers,
        makkah_nights: form.makkah_nights,
        madinah_nights: form.madinah_nights,
      });
      if (!r.success) {
        const first = r.error.issues[0];
        toast.error(first.message);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!stepValid(step)) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const submit = async () => {
    const parsed = formSchema.safeParse({
      guest_name: form.guest_name,
      guest_phone: form.guest_phone,
      guest_email: form.guest_email || "",
      num_travelers: form.num_travelers,
      makkah_nights: form.makkah_nights,
      madinah_nights: form.madinah_nights,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData } = await apiClient.auth.getUser();
      const userId = authData?.user?.id || "00000000-0000-0000-0000-000000000000";

      const payload = {
        user_id: userId,
        program_tier: form.program_tier,
        travel_month: form.travel_month || null,
        num_travelers: form.num_travelers,
        room_type: form.room_type,
        makkah_nights: form.makkah_nights,
        madinah_nights: form.madinah_nights,
        include_visa: form.include_visa,
        include_hotel: form.include_hotel,
        transport_vehicle: form.transport_vehicle,
        catering_package_id: form.catering_package_id || null,
        include_ziyarat: form.include_ziyarat,
        include_reception: form.include_reception,
        estimated_price_sar: estimateSAR,
        estimated_price_bdt: estimateBDT,
        guest_name: form.guest_name,
        guest_phone: form.guest_phone,
        guest_email: form.guest_email || null,
        passport_ready: form.passport_ready,
        special_requests: form.special_requests || null,
        status: "pending",
      };

      const { data, error } = await apiClient
        .from("umrah_orders")
        .insert(payload)
        .select("tracking_id")
        .single();

      if (error) throw error;

      setTrackingId((data as any)?.tracking_id || "TT-UMR-PENDING");
      toast.success(t.successTitle);
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copyTracking = () => {
    if (!trackingId) return;
    navigator.clipboard.writeText(trackingId);
    toast.success("Copied");
  };

  const whatsappLink = trackingId
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Assalamu Alaikum, my Umrah order ID is ${trackingId}.`)}`
    : `https://wa.me/${WHATSAPP_NUMBER}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!trackingId ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl">{t.title}</DialogTitle>
              <DialogDescription>{t.desc}</DialogDescription>
            </DialogHeader>

            {/* Stepper */}
            <div className="flex items-center justify-between gap-2 my-4">
              {t.steps.map((label, i) => (
                <div key={label} className="flex-1 flex items-center gap-2">
                  <div
                    className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < step
                        ? "bg-primary text-primary-foreground"
                        : i === step
                        ? "bg-primary/20 text-primary border border-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${i === step ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                  {i < t.steps.length - 1 && <div className="flex-1 h-px bg-border" />}
                </div>
              ))}
            </div>

            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4 py-2"
            >
              {/* STEP 0: Program */}
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">{t.tier}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PROGRAMS.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setForm({ ...form, program_tier: p.key })}
                          className={`text-left p-3 rounded-xl border transition-all ${
                            form.program_tier === p.key ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="text-sm font-semibold capitalize">{p.key}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">From SAR {p.basePriceSAR.toLocaleString()}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">{t.travelMonth}</label>
                    <select className={inputClass} value={form.travel_month} onChange={(e) => setForm({ ...form, travel_month: e.target.value })}>
                      <option value="">—</option>
                      {MONTHS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 1: Travelers */}
              {step === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">{t.numTravelers}</label>
                    <input
                      type="number" min={1} max={50}
                      className={inputClass}
                      value={form.num_travelers}
                      onChange={(e) => setForm({ ...form, num_travelers: Math.max(1, Number(e.target.value) || 1) })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">{t.roomType}</label>
                    <select className={inputClass} value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value as any })}>
                      {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">{t.nightsMakkah}</label>
                    <input
                      type="number" min={0} max={60}
                      className={inputClass}
                      value={form.makkah_nights}
                      onChange={(e) => setForm({ ...form, makkah_nights: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">{t.nightsMadinah}</label>
                    <input
                      type="number" min={0} max={60}
                      className={inputClass}
                      value={form.madinah_nights}
                      onChange={(e) => setForm({ ...form, madinah_nights: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Services */}
              {step === 2 && (
                <div className="space-y-3">
                  {[
                    { key: "include_visa", label: t.visa },
                    { key: "include_hotel", label: t.hotel },
                    { key: "include_ziyarat", label: t.ziyarat },
                    { key: "include_reception", label: t.reception },
                  ].map((s) => (
                    <label key={s.key} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40">
                      <span className="text-sm font-medium">{s.label}</span>
                      <input
                        type="checkbox"
                        checked={(form as any)[s.key]}
                        onChange={(e) => setForm({ ...form, [s.key]: e.target.checked } as any)}
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  ))}
                  <div>
                    <label className="text-sm font-semibold mb-2 block">{t.transport}</label>
                    <select className={inputClass} value={form.transport_vehicle} onChange={(e) => setForm({ ...form, transport_vehicle: e.target.value as any })}>
                      {VEHICLES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">{t.catering}</label>
                    <select className={inputClass} value={form.catering_package_id} onChange={(e) => setForm({ ...form, catering_package_id: e.target.value })}>
                      <option value="">— None —</option>
                      {cateringPackages.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.meal_type}) — SAR {p.price_per_meal}/meal</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 3: Contact */}
              {step === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold mb-2 block">{t.name}</label>
                    <input className={inputClass} value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">{t.phone}</label>
                    <input className={inputClass} placeholder="+880 / +966 …" value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">{t.email}</label>
                    <input type="email" className={inputClass} value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} />
                  </div>
                  <label className="sm:col-span-2 flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.passport_ready} onChange={(e) => setForm({ ...form, passport_ready: e.target.checked })} className="h-4 w-4 accent-primary" />
                    {t.passport}
                  </label>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold mb-2 block">{t.requests}</label>
                    <textarea rows={3} className={inputClass} value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })} />
                  </div>
                </div>
              )}

              {/* STEP 4: Review */}
              {step === 4 && (
                <div className="space-y-3">
                  <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-2 text-sm">
                    <Row label={t.tier} value={<span className="capitalize">{form.program_tier}</span>} />
                    <Row label={t.travelMonth} value={form.travel_month || "—"} />
                    <Row label={t.numTravelers} value={form.num_travelers} />
                    <Row label={t.roomType} value={<span className="capitalize">{form.room_type}</span>} />
                    <Row label={`${t.nightsMakkah} / ${t.nightsMadinah}`} value={`${form.makkah_nights} / ${form.madinah_nights}`} />
                    <Row label={t.transport} value={<span className="capitalize">{form.transport_vehicle}</span>} />
                    <Row label={t.name} value={form.guest_name} />
                    <Row label={t.phone} value={form.guest_phone} />
                  </div>

                  <div className="rounded-xl p-4 bg-gradient-gold text-primary-foreground">
                    <div className="text-xs uppercase tracking-widest opacity-80 mb-1">{t.estimate}</div>
                    <div className="font-heading text-3xl font-bold tabular-nums">SAR {estimateSAR.toLocaleString()}</div>
                    <div className="text-xs opacity-80 tabular-nums">≈ BDT {estimateBDT.toLocaleString("en-IN")}</div>
                  </div>
                </div>
              )}

              {/* Live estimate footer (steps 1–3) */}
              {step > 0 && step < 4 && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                  <span className="text-muted-foreground">{t.estimate}</span>
                  <span className="font-heading font-bold text-primary tabular-nums">SAR {estimateSAR.toLocaleString()}</span>
                </div>
              )}
            </motion.div>

            {/* Footer nav */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-border disabled:opacity-40 hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" /> {t.back}
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 text-sm px-5 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                >
                  {t.next} <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 text-sm px-5 py-2 rounded-md bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t.submit}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="py-6 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-2xl font-bold mb-1">{t.successTitle}</h3>
              <p className="text-sm text-muted-foreground">{t.successDesc}</p>
            </div>
            <div className="bg-secondary/50 border border-border rounded-xl p-4 max-w-sm mx-auto">
              <div className="text-xs text-muted-foreground mb-1">{t.tracking}</div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-heading text-lg font-bold tabular-nums">{trackingId}</span>
                <button onClick={copyTracking} className="p-2 rounded hover:bg-muted">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#25D366] text-white font-semibold hover:opacity-90">
                <MessageCircle className="h-4 w-4" /> {t.whatsapp}
              </a>
              <button onClick={() => onOpenChange(false)} className="px-5 py-2.5 rounded-md border border-border hover:bg-muted">
                {t.close}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value }: { label: string; value: any }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

export default UmrahOrderDialog;
