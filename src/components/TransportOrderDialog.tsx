import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Bus, ArrowRight } from "lucide-react";
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

export default function TransportOrderDialog({ open, onOpenChange, service }: Props) {
  const { language } = useLanguage();
  const isBn = language === "bn";
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    pickup_date: "",
    pickup_time: "",
    passengers: 1,
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    pickup_address: "",
    dropoff_address: "",
    notes: "",
  });

  const total = useMemo(() => Number(service?.price_sar || 0), [service]);

  const reset = () => {
    setSuccess(null);
    setForm({
      pickup_date: "", pickup_time: "", passengers: 1,
      guest_name: "", guest_phone: "", guest_email: "",
      pickup_address: "", dropoff_address: "", notes: "",
    });
  };

  const submit = async () => {
    if (!service) return;
    if (!form.guest_name.trim() || !form.guest_phone.trim() || !form.pickup_date) {
      toast.error(isBn ? "নাম, ফোন ও পিকআপ তারিখ আবশ্যক" : "Name, phone and pickup date are required");
      return;
    }
    setSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("transport_orders").insert({
        service_id: service.id || null,
        vehicle_type: service.vehicle_type,
        route_from: service.route_from,
        route_to: service.route_to,
        pickup_date: form.pickup_date,
        pickup_time: form.pickup_time,
        passengers: form.passengers,
        guest_name: form.guest_name,
        guest_phone: form.guest_phone,
        guest_email: form.guest_email || null,
        pickup_address: form.pickup_address,
        dropoff_address: form.dropoff_address,
        notes: form.notes,
        total_price: total,
        currency: "SAR",
        user_id: auth.user?.id || null,
      } as any).select("tracking_id").single();
      if (error) throw error;
      setSuccess((data as any).tracking_id);
      toast.success(isBn ? "বুকিং সম্পন্ন হয়েছে" : "Booking received");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5 text-primary" />
            {isBn ? "ট্রান্সপোর্ট বুকিং" : "Book Transport"}
          </DialogTitle>
          <DialogDescription>
            {service?.vehicle_type} — {service?.route_from} → {service?.route_to}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
            <h3 className="text-xl font-bold">{isBn ? "বুকিং নিশ্চিত!" : "Booking Confirmed!"}</h3>
            <p className="text-sm text-muted-foreground">{isBn ? "ট্র্যাকিং আইডি" : "Tracking ID"}</p>
            <p className="text-lg font-mono font-bold text-primary">{success}</p>
            <p className="text-xs text-muted-foreground">{isBn ? "আমরা শীঘ্রই যোগাযোগ করব।" : "Our team will contact you shortly."}</p>
            <Button onClick={() => { reset(); onOpenChange(false); }} className="mt-4">{isBn ? "বন্ধ করুন" : "Close"}</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isBn ? "পিকআপ তারিখ" : "Pickup Date"} *</Label>
                <Input type="date" value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} />
              </div>
              <div>
                <Label>{isBn ? "পিকআপ সময়" : "Pickup Time"}</Label>
                <Input type="time" value={form.pickup_time} onChange={(e) => setForm({ ...form, pickup_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{isBn ? "যাত্রী সংখ্যা" : "Passengers"}</Label>
              <Input type="number" min={1} max={50} value={form.passengers} onChange={(e) => setForm({ ...form, passengers: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{isBn ? "পূর্ণ নাম" : "Full Name"} *</Label>
                <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
              </div>
              <div>
                <Label>{isBn ? "ফোন (WhatsApp)" : "Phone (WhatsApp)"} *</Label>
                <Input value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} placeholder="+966..." />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} />
            </div>
            <div>
              <Label>{isBn ? "পিকআপ ঠিকানা" : "Pickup Address"}</Label>
              <Input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} placeholder={isBn ? "হোটেল / এয়ারপোর্ট টার্মিনাল" : "Hotel / Airport terminal"} />
            </div>
            <div>
              <Label>{isBn ? "ড্রপ-অফ ঠিকানা" : "Drop-off Address"}</Label>
              <Input value={form.dropoff_address} onChange={(e) => setForm({ ...form, dropoff_address: e.target.value })} />
            </div>
            <div>
              <Label>{isBn ? "নোট" : "Notes"}</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
              <div className="text-sm text-muted-foreground">{isBn ? "মোট আনুমানিক" : "Estimated Total"}</div>
              <div className="font-heading text-2xl font-bold text-primary">SAR {total}</div>
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
              {isBn ? "বুকিং নিশ্চিত করুন" : "Confirm Booking"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
