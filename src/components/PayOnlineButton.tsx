import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useCurrencyRate, bdtToSar, formatSAR } from "@/hooks/useCurrencyRate";

interface Props {
  bookingId?: string;
  trackingId?: string;
  dueAmount: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  bookingStatus?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
  label?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

// Statuses where the voucher is considered confirmed and online payment is unlocked.
const PAYMENT_UNLOCKED_STATUSES = new Set([
  "confirmed",
  "visa_processing",
  "visa_issued",
  "ticket_processing",
  "ticket_issued",
  "ticket_confirmed",
  "completed",
]);

export const PayOnlineButton = ({
  bookingId, trackingId, dueAmount, customerName, customerPhone, customerEmail,
  bookingStatus, size = "default", variant = "default", className, label = "Pay Online",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(String(dueAmount || 0));
  const [phone, setPhone] = useState(customerPhone || "");
  const [name, setName] = useState(customerName || "");
  const [email, setEmail] = useState(customerEmail || "");
  const [loading, setLoading] = useState(false);
  const { rate } = useCurrencyRate();

  const isUnlocked = !bookingStatus || PAYMENT_UNLOCKED_STATUSES.has(bookingStatus);
  const sarEquivalent = bdtToSar(Number(amount) || 0, rate.sar_to_bdt);
  const dueSar = bdtToSar(Number(dueAmount) || 0, rate.sar_to_bdt);

  const handlePay = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > Number(dueAmount) + 0.01) return toast.error(`Max ৳${dueAmount}`);
    if (!phone) return toast.error("Phone number required");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/online/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          tracking_id: trackingId,
          amount: amt,
          customer: { name, phone, email },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.gateway_url) throw new Error(data.error || "Failed to start payment");
      window.location.href = data.gateway_url;
    } catch (e: any) {
      toast.error(e.message);
      setLoading(false);
    }
  };

  if (Number(dueAmount) <= 0) return null;

  if (!isUnlocked) {
    return (
      <Button
        size={size}
        variant="outline"
        className={className}
        disabled
        title="Voucher confirm হওয়ার পরে Payment Option চালু হবে"
      >
        <Lock className="h-4 w-4 mr-2" /> Payment Locked
      </Button>
    );
  }

  return (
    <>
      <Button size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
        <CreditCard className="h-4 w-4 mr-2" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Online</DialogTitle>
            <DialogDescription>
              bKash, Nagad, Rocket, Card, International — সব accept করি (SSLCommerz secure gateway)।
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-secondary/50 border border-border rounded-md p-3 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Total Due</span>
              <span className="font-semibold tabular-nums">
                {formatSAR(dueSar)}
                <span className="text-muted-foreground font-normal mx-1.5">≈</span>
                ৳{Number(dueAmount).toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <Label>Amount to pay (৳ BDT)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} max={dueAmount} />
              <p className="text-xs text-muted-foreground mt-1">
                ≈ {formatSAR(sarEquivalent)} (1 SAR = ৳{rate.sar_to_bdt})
              </p>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handlePay} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting...</> : `Pay ৳${amount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
