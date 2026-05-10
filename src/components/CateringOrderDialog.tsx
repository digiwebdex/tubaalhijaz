import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/i18n/LanguageContext";

export interface CateringPlan {
  id?: string;
  name: string;
  meal_type: string;
  cuisine: string;
  price_per_meal: number;
  image?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: CateringPlan | null;
}

export default function CateringOrderDialog({ open, onOpenChange, plan }: Props) {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [persons, setPersons] = useState(1);
  const [days, setDays] = useState(7);
  const [startDate, setStartDate] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setSuccess(null);
    setPersons(1); setDays(7); setStartDate("");
    setName(""); setPhone(""); setEmail(""); setAddress(""); setNotes("");
  }, [open, plan?.id]);

  const total = (plan?.price_per_meal || 0) * persons * days;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error(isBn ? "নাম ও ফোন আবশ্যক" : "Name & phone required");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        package_id: plan?.id || null,
        persons,
        days,
        start_date: startDate || null,
        total_price: total,
        currency: "SAR",
        delivery_address: address || null,
        guest_name: name,
        guest_phone: phone,
        guest_email: email || null,
        notes: notes || null,
        status: "pending",
      };
      const { data, error } = await (apiClient as any)
        .from("catering_orders").insert(payload).select().single();
      if (error) throw error;
      try {
        await (apiClient as any).functions.invoke("send-notification", {
          body: {
            event_type: "catering_order",
            subject: `New Catering Order — ${plan?.name}`,
            message: `${name} (${phone}) ordered ${plan?.name} for ${persons} persons × ${days} days = SAR ${total}.`,
            booking_ref: data?.id,
          },
        });
      } catch {}
      setSuccess((data?.id as string)?.slice(0, 8).toUpperCase() || "OK");
      toast.success(isBn ? "অর্ডার সফল হয়েছে" : "Order placed successfully");
    } catch (err: any) {
      toast.error(err?.message || (isBn ? "সাবমিট ব্যর্থ" : "Submission failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const Counter = ({ value, set, min = 1 }: { value: number; set: (n: number) => void; min?: number }) => (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => set(Math.max(min, value - 1))}>
        <Minus className="h-4 w-4" />
      </Button>
      <Input value={value} onChange={e => set(Math.max(min, Number(e.target.value) || min))} className="w-16 text-center" />
      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => set(value + 1)}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[96vw] p-0 overflow-hidden">
        {plan?.image && (
          <div className="relative h-32 sm:h-40 overflow-hidden">
            <img src={plan.image} alt={plan.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        )}
        <div className="px-5 sm:px-6 pb-5">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="font-heading text-2xl">{plan?.name}</DialogTitle>
            <DialogDescription>
              {plan?.cuisine} · SAR {plan?.price_per_meal} {isBn ? "প্রতি মিল" : "per meal"}
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-3" />
              <h3 className="font-heading text-xl font-bold mb-1">{isBn ? "অর্ডার সফল!" : "Order Placed!"}</h3>
              <p className="text-sm text-muted-foreground mb-3">{isBn ? "শীঘ্রই যোগাযোগ করব" : "We will contact you shortly"}</p>
              <p className="text-xs font-mono bg-secondary inline-block px-3 py-1.5 rounded">REF: {success}</p>
              <div className="mt-5">
                <Button onClick={() => onOpenChange(false)}>{isBn ? "বন্ধ করুন" : "Close"}</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">{isBn ? "ব্যক্তি সংখ্যা" : "Persons"}</Label>
                  <Counter value={persons} set={setPersons} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{isBn ? "দিন সংখ্যা" : "Days"}</Label>
                  <Counter value={days} set={setDays} />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">{isBn ? "শুরুর তারিখ" : "Start date"}</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">{isBn ? "পূর্ণ নাম *" : "Full name *"}</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{isBn ? "ফোন *" : "Phone *"}</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">{isBn ? "ইমেইল" : "Email"}</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">{isBn ? "হোটেল / ডেলিভারি ঠিকানা" : "Hotel / Delivery address"}</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder={isBn ? "মক্কা / মদিনা" : "Makkah / Madinah"} />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">{isBn ? "নোট" : "Notes"}</Label>
                <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-sunset text-white">
                <span className="text-sm font-semibold uppercase tracking-wider">{isBn ? "মোট" : "Total"}</span>
                <span className="font-heading text-2xl font-bold">SAR {total.toLocaleString()}</span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  {isBn ? "বাতিল" : "Cancel"}
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isBn ? "অর্ডার করুন" : "Place Order"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
