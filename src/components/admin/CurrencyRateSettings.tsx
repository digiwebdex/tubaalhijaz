import { useEffect, useState } from "react";
import { supabase } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Coins } from "lucide-react";

export default function CurrencyRateSettings() {
  const [rate, setRate] = useState("30");
  const [showDual, setShowDual] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("setting_value")
      .eq("setting_key", "currency_rate")
      .maybeSingle()
      .then(({ data }) => {
        const v = (data as any)?.setting_value || {};
        setRate(String(v.sar_to_bdt ?? 30));
        setShowDual(v.show_dual_currency !== false);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    const numRate = Number(rate);
    if (!numRate || numRate <= 0) {
      toast.error("Enter a valid Riyal rate");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("company_settings")
      .update({ setting_value: { sar_to_bdt: numRate, show_dual_currency: showDual } })
      .eq("setting_key", "currency_rate");
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Riyal rate updated");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Riyal rate set করুন। Booking amount BDT তে save হবে, কিন্তু customer কে SAR + আনুমানিক BDT — দুটোই দেখানো হবে।
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-1.5">1 SAR = ? BDT</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-center gap-3 pt-7">
          <input
            id="dual-currency"
            type="checkbox"
            checked={showDual}
            onChange={(e) => setShowDual(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <label htmlFor="dual-currency" className="text-sm font-medium">
            Customer-facing pages এ SAR + BDT দুটোই দেখাও
          </label>
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-gradient-gold text-primary-foreground font-semibold px-5 py-2.5 rounded-md text-sm flex items-center gap-2 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
        Save Rate
      </button>
    </div>
  );
}
