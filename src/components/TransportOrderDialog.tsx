import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Plus, X, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export interface TransportService {
  id?: string;
  vehicle_type: string;
  route_from?: string;
  route_to?: string;
  price_sar: number;
  capacity?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  service: TransportService | null;
}

interface HotelRow {
  city: "MAKKAH" | "MADINAH";
  hotel: string;
  agreement_no: string;
  check_in: string;
  check_out: string;
  rooms: string;
}

interface FlightRow {
  type: "ARRIVAL" | "DEPARTURE";
  airport: string;
  date: string;
  time: string;
  flight_no: string;
  airline: string;
}

interface MovementRow {
  date: string;
  from: string;
  to: string;
  time: string;
}

const BiLabel = ({ en, ar }: { en: string; ar: string }) => (
  <div className="flex items-baseline justify-between gap-2 mb-1">
    <span className="text-xs font-semibold text-foreground">{en}</span>
    <span dir="rtl" className="text-xs text-muted-foreground font-arabic">{ar}</span>
  </div>
);

const SectionTitle = ({ en, ar }: { en: string; ar: string }) => (
  <div className="flex items-center justify-between border-b border-border pb-2 mb-3 mt-2">
    <h3 className="font-heading text-sm font-bold uppercase tracking-wide">{en}</h3>
    <span dir="rtl" className="text-sm text-muted-foreground">{ar}</span>
  </div>
);

const nightsBetween = (a: string, b: string) => {
  if (!a || !b) return 0;
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  if (isNaN(d1) || isNaN(d2) || d2 < d1) return 0;
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

export default function TransportOrderDialog({ open, onOpenChange, service }: Props) {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [agentName, setAgentName] = useState("");
  const [agentCountry, setAgentCountry] = useState("");
  const [umrahCompany, setUmrahCompany] = useState("");

  const [groupNumbers, setGroupNumbers] = useState<string[]>([""]);
  const [packageName, setPackageName] = useState("");
  const [travelDate, setTravelDate] = useState("");

  const [hotels, setHotels] = useState<HotelRow[]>([
    { city: "MAKKAH", hotel: "", agreement_no: "", check_in: "", check_out: "", rooms: "" },
    { city: "MADINAH", hotel: "", agreement_no: "", check_in: "", check_out: "", rooms: "" },
  ]);

  const [transportType, setTransportType] = useState("");
  const [pilgrimCount, setPilgrimCount] = useState("");

  const [flights, setFlights] = useState<FlightRow[]>([
    { type: "ARRIVAL", airport: "", date: "", time: "", flight_no: "", airline: "" },
    { type: "DEPARTURE", airport: "", date: "", time: "", flight_no: "", airline: "" },
  ]);

  const [movements, setMovements] = useState<MovementRow[]>([
    { date: "", from: "", to: "", time: "" },
  ]);

  const [supMakkah, setSupMakkah] = useState("");
  const [supMadinah, setSupMadinah] = useState("");
  const [ops24, setOps24] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (service && open) {
      const t = service.vehicle_type || "";
      setTransportType(t.split("(")[0].trim().toUpperCase());
    }
  }, [service, open]);

  const reset = () => {
    setAgentName(""); setAgentCountry(""); setUmrahCompany("");
    setGroupNumbers([""]); setPackageName(""); setTravelDate("");
    setHotels([
      { city: "MAKKAH", hotel: "", agreement_no: "", check_in: "", check_out: "", rooms: "" },
      { city: "MADINAH", hotel: "", agreement_no: "", check_in: "", check_out: "", rooms: "" },
    ]);
    setPilgrimCount("");
    setFlights([
      { type: "ARRIVAL", airport: "", date: "", time: "", flight_no: "", airline: "" },
      { type: "DEPARTURE", airport: "", date: "", time: "", flight_no: "", airline: "" },
    ]);
    setMovements([{ date: "", from: "", to: "", time: "" }]);
    setSupMakkah(""); setSupMadinah(""); setOps24("");
    setContactName(""); setContactPhone(""); setContactEmail(""); setNotes("");
    setSuccess(null);
  };

  const updateHotel = (i: number, k: keyof HotelRow, v: string) => {
    setHotels(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  };
  const updateFlight = (i: number, k: keyof FlightRow, v: string) => {
    setFlights(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  };
  const updateMovement = (i: number, k: keyof MovementRow, v: string) => {
    setMovements(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGroups = groupNumbers.map(g => g.trim()).filter(Boolean);
    if (cleanGroups.length === 0) {
      toast.error(isBn ? "অন্তত একটি গ্রুপ নাম্বার দিন" : "Add at least one group number");
      return;
    }
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error(isBn ? "নাম এবং ফোন দিন" : "Name and phone are required");
      return;
    }

    setSubmitting(true);
    try {
      const hotelsPayload = hotels.map(h => ({
        ...h,
        nights: nightsBetween(h.check_in, h.check_out),
      }));

      const { data, error } = await (supabase as any)
        .from("transport_voucher_orders")
        .insert({
          agent_name: agentName || null,
          agent_country: agentCountry || null,
          umrah_company: umrahCompany || null,
          group_numbers: cleanGroups,
          package_name: packageName || null,
          travel_date: travelDate || null,
          hotels: hotelsPayload,
          transport_type: transportType || null,
          pilgrim_count: pilgrimCount ? Number(pilgrimCount) : null,
          flights,
          internal_movements: movements,
          supervisor_makkah_phone: supMakkah || null,
          supervisor_madinah_phone: supMadinah || null,
          ops_24h_phone: ops24 || null,
          contact_name: contactName,
          contact_phone: contactPhone,
          contact_email: contactEmail || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Fire-and-forget admin notification
      try {
        await (supabase as any).functions.invoke("send-notification", {
          body: {
            event_type: "transport_voucher_order",
            subject: `New Transport Voucher Booking — ${transportType}`,
            message: `New booking from ${contactName} (${contactPhone}). Groups: ${cleanGroups.join(", ")}. Package: ${packageName}. Pilgrims: ${pilgrimCount}.`,
            booking_ref: data?.id,
          },
        });
      } catch { /* non-fatal */ }

      const ref = (data?.id as string)?.slice(0, 8).toUpperCase() || "OK";
      setSuccess(ref);
      toast.success(isBn ? "বুকিং সফল হয়েছে" : "Booking submitted successfully");
    } catch (err: any) {
      toast.error(err?.message || (isBn ? "সাবমিট ব্যর্থ হয়েছে" : "Submission failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v && success) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-[96vw] sm:w-[95vw] max-h-[95vh] sm:max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="font-heading text-xl">
              {isBn ? "ট্রান্সপোর্ট ভাউচার বুকিং" : "Transport Voucher Booking"}
            </DialogTitle>
            <span dir="rtl" className="text-base font-semibold">قسيمة النقل</span>
          </div>
          <DialogDescription>
            {service?.vehicle_type} · {service?.route_from} → {service?.route_to} · SAR {service?.price_sar}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="font-heading text-2xl font-bold mb-2">
              {isBn ? "বুকিং সফল!" : "Booking Submitted!"}
            </h3>
            <p className="text-muted-foreground mb-2">
              {isBn ? "আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব" : "We will contact you shortly"}
            </p>
            <p className="text-sm font-mono bg-secondary inline-block px-4 py-2 rounded">REF: {success}</p>
            <div className="mt-6">
              <Button onClick={() => handleClose(false)}>{isBn ? "বন্ধ করুন" : "Close"}</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-2 overscroll-contain">
              {/* Header row */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <BiLabel en="Agent name" ar="اسم الوكيل" />
                  <Input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="e.g. SAAD USWA" />
                </div>
                <div>
                  <BiLabel en="Agent country" ar="دولة الوكيل" />
                  <Input value={agentCountry} onChange={e => setAgentCountry(e.target.value)} placeholder="e.g. BANGLADESH" />
                </div>
                <div>
                  <BiLabel en="Umrah Company" ar="شركة عمرة" />
                  <Input value={umrahCompany} onChange={e => setUmrahCompany(e.target.value)} />
                </div>
              </div>

              {/* Group + Package */}
              <SectionTitle en="Group / Package" ar="المجموعة / البرنامج" />
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <BiLabel en="Group numbers" ar="أرقام المجموعات" />
                  <div className="space-y-2">
                    {groupNumbers.map((g, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={g}
                          onChange={e => setGroupNumbers(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
                          placeholder={`Group #${i + 1}`}
                        />
                        {groupNumbers.length > 1 && (
                          <Button type="button" variant="ghost" size="icon"
                            onClick={() => setGroupNumbers(prev => prev.filter((_, idx) => idx !== i))}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => setGroupNumbers(prev => [...prev, ""])}>
                      <Plus className="h-3 w-3 mr-1" /> {isBn ? "আরেকটি যোগ করুন" : "Add another"}
                    </Button>
                  </div>
                </div>
                <div>
                  <BiLabel en="Package / Program" ar="البرنامج" />
                  <Input value={packageName} onChange={e => setPackageName(e.target.value)} placeholder="e.g. REYAZUL JANNAH" />
                </div>
                <div>
                  <BiLabel en="Travel date" ar="التاريخ" />
                  <Input type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)} />
                </div>
              </div>

              {/* Hotels */}
              <SectionTitle en="Hotels" ar="الفنادق" />
              <div className="space-y-4">
                {hotels.map((h, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 bg-secondary/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{h.city}</Badge>
                      <span dir="rtl" className="text-sm text-muted-foreground">
                        {h.city === "MAKKAH" ? "مكة المكرمة" : "المدينة المنورة"}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-6 gap-3">
                      <div className="md:col-span-2">
                        <BiLabel en="Hotel" ar="الفندق" />
                        <Input value={h.hotel} onChange={e => updateHotel(i, "hotel", e.target.value)} />
                      </div>
                      <div>
                        <BiLabel en="Agreement No." ar="رقم الاتفاقية" />
                        <Input value={h.agreement_no} onChange={e => updateHotel(i, "agreement_no", e.target.value)} />
                      </div>
                      <div>
                        <BiLabel en="Check-in" ar="تاريخ الدخول" />
                        <Input type="date" value={h.check_in} onChange={e => updateHotel(i, "check_in", e.target.value)} />
                      </div>
                      <div>
                        <BiLabel en="Check-out" ar="تاريخ الخروج" />
                        <Input type="date" value={h.check_out} onChange={e => updateHotel(i, "check_out", e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <BiLabel en="Nights" ar="الليالي" />
                          <Input value={nightsBetween(h.check_in, h.check_out) || ""} readOnly className="bg-muted" />
                        </div>
                        <div>
                          <BiLabel en="Rooms" ar="الغرف" />
                          <Input type="number" min={0} value={h.rooms} onChange={e => updateHotel(i, "rooms", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Transport */}
              <SectionTitle en="Transport" ar="النقل" />
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <BiLabel en="Type of transportation" ar="نوع الحافلة" />
                  <Input value={transportType} onChange={e => setTransportType(e.target.value)} />
                </div>
                <div>
                  <BiLabel en="Number of pilgrims" ar="عدد المعتمرين" />
                  <Input type="number" min={1} value={pilgrimCount} onChange={e => setPilgrimCount(e.target.value)} />
                </div>
              </div>

              {/* Flights */}
              <SectionTitle en="Flights" ar="الرحلات" />
              <div className="space-y-3">
                {flights.map((f, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 bg-secondary/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge>{f.type}</Badge>
                      <span dir="rtl" className="text-sm text-muted-foreground">
                        {f.type === "ARRIVAL" ? "وصول" : "مغادرة"}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-5 gap-3">
                      <div>
                        <BiLabel en="Airport" ar="المطار" />
                        <Input value={f.airport} onChange={e => updateFlight(i, "airport", e.target.value)} placeholder="JEDDAH AIRPORT" />
                      </div>
                      <div>
                        <BiLabel en="Date" ar="التاريخ" />
                        <Input type="date" value={f.date} onChange={e => updateFlight(i, "date", e.target.value)} />
                      </div>
                      <div>
                        <BiLabel en="Time" ar="الوقت" />
                        <Input type="time" value={f.time} onChange={e => updateFlight(i, "time", e.target.value)} />
                      </div>
                      <div>
                        <BiLabel en="Flight number" ar="رقم الرحلة" />
                        <Input value={f.flight_no} onChange={e => updateFlight(i, "flight_no", e.target.value)} placeholder="QR 1182" />
                      </div>
                      <div>
                        <BiLabel en="Airline" ar="الخطوط" />
                        <Input value={f.airline} onChange={e => updateFlight(i, "airline", e.target.value)} placeholder="QATAR AIRWAYS" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Internal movements */}
              <SectionTitle en="Internal Movements" ar="التحركات الداخلية" />
              <div className="space-y-2">
                {movements.map((m, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 bg-secondary/30 relative">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">#{i + 1}</Badge>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setMovements(prev => prev.filter((_, idx) => idx !== i))}
                        disabled={movements.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Date / التاريخ</Label>
                        <Input type="date" value={m.date} onChange={e => updateMovement(i, "date", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Time / الساعة</Label>
                        <Input type="time" value={m.time} onChange={e => updateMovement(i, "time", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">From / من</Label>
                        <Input value={m.from} onChange={e => updateMovement(i, "from", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">To / إلى</Label>
                        <Input value={m.to} onChange={e => updateMovement(i, "to", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setMovements(prev => [...prev, { date: "", from: "", to: "", time: "" }])}>
                  <Plus className="h-3 w-3 mr-1" /> {isBn ? "সারি যোগ করুন" : "Add row"}
                </Button>
              </div>

              {/* Supervisors */}
              <SectionTitle en="Supervisors" ar="المناديب" />
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <BiLabel en="Makkah supervisor" ar="المشرف في مكة" />
                  <Input value={supMakkah} onChange={e => setSupMakkah(e.target.value)} placeholder="Mobile" />
                </div>
                <div>
                  <BiLabel en="Madinah supervisor" ar="المشرف في المدينة" />
                  <Input value={supMadinah} onChange={e => setSupMadinah(e.target.value)} placeholder="Mobile" />
                </div>
                <div>
                  <BiLabel en="Operations 24h" ar="العمليات 24 ساعة" />
                  <Input value={ops24} onChange={e => setOps24(e.target.value)} placeholder="Mobile" />
                </div>
              </div>

              {/* Contact */}
              <SectionTitle en="Your Contact" ar="معلومات الاتصال" />
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <BiLabel en="Full name" ar="الاسم الكامل" />
                  <Input value={contactName} onChange={e => setContactName(e.target.value)} required />
                </div>
                <div>
                  <BiLabel en="Phone" ar="الهاتف" />
                  <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} required />
                </div>
                <div>
                  <BiLabel en="Email" ar="البريد الإلكتروني" />
                  <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                </div>
                <div>
                  <BiLabel en="Notes" ar="ملاحظات" />
                  <Textarea rows={1} value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t bg-secondary/30 shrink-0">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                {isBn ? "বাতিল" : "Cancel"}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isBn ? "বুকিং সাবমিট করুন" : "Submit Booking"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
