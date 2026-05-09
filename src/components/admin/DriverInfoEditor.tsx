import { useState, useEffect } from "react";
import { supabase } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Truck, MessageCircle } from "lucide-react";

interface Props {
  bookingId: string;
  initial?: {
    driver_name?: string | null;
    driver_phone?: string | null;
    vehicle_number?: string | null;
    pickup_location?: string | null;
    pickup_time?: string | null;
    driver_notes?: string | null;
  };
  onSaved?: () => void;
}

// Convert ISO timestamp -> "YYYY-MM-DDTHH:mm" for datetime-local input
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function DriverInfoEditor({ bookingId, initial, onSaved }: Props) {
  const [form, setForm] = useState({
    driver_name: "",
    driver_phone: "",
    vehicle_number: "",
    pickup_location: "",
    pickup_time: "",
    driver_notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      driver_name: initial?.driver_name || "",
      driver_phone: initial?.driver_phone || "",
      vehicle_number: initial?.vehicle_number || "",
      pickup_location: initial?.pickup_location || "",
      pickup_time: toLocalInput(initial?.pickup_time),
      driver_notes: initial?.driver_notes || "",
    });
  }, [bookingId, initial]);

  const buildMessage = (trackingId: string) => {
    const lines = [
      `Assalamu Alaikum! আপনার trip (${trackingId}) এর Driver Information:`,
      form.driver_name ? `• Driver: ${form.driver_name}` : "",
      form.driver_phone ? `• Contact: ${form.driver_phone}` : "",
      form.vehicle_number ? `• Vehicle: ${form.vehicle_number}` : "",
      form.pickup_time ? `• Pickup Time: ${new Date(form.pickup_time).toLocaleString("en-GB")}` : "",
      form.pickup_location ? `• Pickup Location: ${form.pickup_location}` : "",
      form.driver_notes ? `• Note: ${form.driver_notes}` : "",
      "",
      "— TRIP TASTIC | +880 1711-999910",
    ].filter(Boolean);
    return lines.join("\n");
  };

  const sendNotifications = async (booking: any) => {
    if (!booking) return;
    const message = buildMessage(booking.tracking_id || "");
    const subject = `🚗 Driver Assigned — ${booking.tracking_id || ""}`;
    try {
      await supabase.functions.invoke("send-notification", {
        body: {
          type: "custom",
          channels: ["email", "sms"],
          user_id: booking.user_id || "00000000-0000-0000-0000-000000000000",
          booking_id: booking.id,
          custom_subject: subject,
          custom_message: message.replace(/\n/g, "<br/>"),
        },
      });
    } catch (e) {
      console.warn("notification dispatch failed", e);
    }
  };

  const openWhatsApp = async () => {
    const { data: b } = await supabase
      .from("bookings")
      .select("tracking_id, customer_phone, profiles:user_id(phone)")
      .eq("id", bookingId)
      .maybeSingle();
    const phone = (b as any)?.customer_phone || (b as any)?.profiles?.phone || "";
    const cleaned = String(phone).replace(/[^\d]/g, "");
    if (!cleaned) {
      toast.error("যাত্রীর phone number পাওয়া যায়নি");
      return;
    }
    const wa = cleaned.startsWith("880") ? cleaned : `880${cleaned.replace(/^0/, "")}`;
    const text = encodeURIComponent(buildMessage((b as any)?.tracking_id || ""));
    window.open(`https://wa.me/${wa}?text=${text}`, "_blank");
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: updated, error } = await supabase
      .from("bookings")
      .update({
        driver_name: form.driver_name || null,
        driver_phone: form.driver_phone || null,
        vehicle_number: form.vehicle_number || null,
        pickup_location: form.pickup_location || null,
        pickup_time: form.pickup_time ? new Date(form.pickup_time).toISOString() : null,
        driver_notes: form.driver_notes || null,
      })
      .eq("id", bookingId)
      .select("id, tracking_id, user_id")
      .maybeSingle();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Driver info updated — যাত্রীকে Email + SMS notification পাঠানো হলো");
    sendNotifications(updated);
    onSaved?.();
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <h3 className="font-heading text-lg font-bold flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" /> Driver & Trip Information
      </h3>
      <p className="text-xs text-muted-foreground">
        যাত্রী travel করার আগে driver/pickup details update করুন। এই info যাত্রীর Account Dashboard এ live দেখাবে।
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Driver Name</Label>
          <Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} placeholder="Md. Karim" />
        </div>
        <div>
          <Label>Driver Mobile Number</Label>
          <Input value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} placeholder="+880 1XXXXXXXXX" />
        </div>
        <div>
          <Label>Vehicle Number</Label>
          <Input value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} placeholder="DHA-METRO-12-3456" />
        </div>
        <div>
          <Label>Pickup Time</Label>
          <Input type="datetime-local" value={form.pickup_time} onChange={(e) => setForm({ ...form, pickup_time: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Pickup Location</Label>
          <Input value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} placeholder="House #12, Road #5, Dhanmondi, Dhaka" />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes (optional)</Label>
          <Textarea value={form.driver_notes} onChange={(e) => setForm({ ...form, driver_notes: e.target.value })} placeholder="Any special instructions" />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="bg-gradient-gold text-primary-foreground">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
        Save Driver Info
      </Button>
    </div>
  );
}
