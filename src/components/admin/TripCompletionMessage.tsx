import { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2, MessageCircle, Send } from "lucide-react";

interface Props {
  bookingId: string;
  trackingId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  userId?: string | null;
  companyName?: string;
}

const DEFAULT_MESSAGE = (name: string, company: string) =>
  `প্রিয় ${name || "যাত্রী"},\n\nআমাদের ${company} এর সার্ভিস গ্রহণ করার জন্য আপনাকে অসংখ্য ধন্যবাদ। ইনশাআল্লাহ ভবিষ্যতেও আবার আপনাদের সাথে দেখা হবে। আপনার সফর সুন্দর ও নিরাপদ হোক।\n\n— ${company}`;

export default function TripCompletionMessage({
  bookingId, trackingId, customerName, customerPhone, userId,
  companyName = "TRIP TASTIC",
}: Props) {
  const [msg, setMsg] = useState(DEFAULT_MESSAGE(customerName || "", companyName));
  const [sending, setSending] = useState(false);

  const sendEmailSms = async () => {
    setSending(true);
    try {
      const { error } = await apiClient.functions.invoke("send-notification", {
        body: {
          type: "custom",
          channels: ["email", "sms"],
          user_id: userId || "00000000-0000-0000-0000-000000000000",
          booking_id: bookingId,
          custom_subject: `🤲 ধন্যবাদ — ${trackingId || ""} | ${companyName}`,
          custom_message: msg.replace(/\n/g, "<br/>"),
        },
      });
      if (error) throw error;
      toast.success("Thank You message Email + SMS এ পাঠানো হলো");
    } catch (e: any) {
      toast.error(e?.message || "পাঠাতে সমস্যা হলো");
    } finally {
      setSending(false);
    }
  };

  const openWhatsApp = () => {
    const cleaned = String(customerPhone || "").replace(/[^\d]/g, "");
    if (!cleaned) {
      toast.error("যাত্রীর phone number পাওয়া যায়নি");
      return;
    }
    const wa = cleaned.startsWith("880") ? cleaned : `880${cleaned.replace(/^0/, "")}`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" />
        <h3 className="font-heading text-lg font-bold">Final Completion Message</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Trip শেষ হলে যাত্রীকে Thank You message পাঠান — WhatsApp + Email এ।
      </p>
      <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={6} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={sendEmailSms} disabled={sending} className="bg-gradient-gold text-primary-foreground">
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Send via Email + SMS
        </Button>
        <Button type="button" variant="outline" onClick={openWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" /> Send via WhatsApp
        </Button>
      </div>
    </div>
  );
}
