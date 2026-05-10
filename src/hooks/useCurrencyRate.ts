import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

export interface CurrencyRate {
  sar_to_bdt: number;
  show_dual_currency: boolean;
}

const DEFAULT: CurrencyRate = { sar_to_bdt: 30, show_dual_currency: true };

export function useCurrencyRate() {
  const [rate, setRate] = useState<CurrencyRate>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient
      .from("company_settings")
      .select("setting_value")
      .eq("setting_key", "currency_rate")
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        const v = (data as any)?.setting_value || {};
        setRate({
          sar_to_bdt: Number(v.sar_to_bdt) > 0 ? Number(v.sar_to_bdt) : DEFAULT.sar_to_bdt,
          show_dual_currency: v.show_dual_currency !== false,
        });
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { rate, loading };
}

export function bdtToSar(bdt: number, sarToBdt: number): number {
  if (!sarToBdt || sarToBdt <= 0) return 0;
  return bdt / sarToBdt;
}

export function formatSAR(amount: number): string {
  return `SAR ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function formatBDTSimple(amount: number): string {
  return `৳${Number(amount).toLocaleString("en-IN")}`;
}
