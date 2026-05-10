import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

export default function DriverAlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  useEffect(() => { apiClient.request("/ops/alerts?status=open").then(setAlerts as any).catch(console.error); }, []);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Operational Alerts</h1>
      {alerts.length === 0 && <div className="text-slate-500 italic text-sm">No open alerts.</div>}
      {alerts.map(a => (
        <div key={a.id} className="rounded-xl border border-amber-500/20 bg-slate-900 p-3">
          <div className="font-semibold">{a.title}</div>
          {a.body && <div className="text-xs text-slate-400 mt-1">{a.body}</div>}
        </div>
      ))}
    </div>
  );
}
