import { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { ScanLine } from "lucide-react";

export default function DriverScanPage() {
  const [tracking, setTracking] = useState("");
  const [result, setResult] = useState<any>(null);
  const verify = async () => {
    if (!tracking) return;
    try {
      const r = await apiClient.request(`/verify/${encodeURIComponent(tracking.trim())}`);
      setResult(r);
    } catch (e: any) { setResult({ error: e.message }); }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2"><ScanLine className="h-5 w-5 text-amber-400" /> QR / Tracking Verify</h1>
      <div className="space-y-2">
        <input value={tracking} onChange={e => setTracking(e.target.value.toUpperCase())}
          placeholder="TT-... or scanned token"
          className="w-full bg-slate-900 border border-amber-500/30 rounded-lg p-3 font-mono" />
        <button onClick={verify} className="w-full py-3 rounded-lg bg-amber-500 text-slate-900 font-bold">Verify</button>
      </div>
      {result && (
        <pre className="bg-slate-900 p-3 rounded-lg text-xs overflow-auto border border-amber-500/20">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
