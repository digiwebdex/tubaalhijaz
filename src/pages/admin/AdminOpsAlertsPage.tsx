import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

const SEVERITY: Record<string, string> = {
  info: "border-slate-400 text-slate-600",
  warning: "border-amber-500 text-amber-600",
  critical: "border-red-500 text-red-600",
};

export default function AdminOpsAlertsPage() {
  const [tab, setTab] = useState<"open" | "acknowledged" | "resolved">("open");
  const [list, setList] = useState<any[]>([]);
  const load = async () => {
    const r = await apiClient.request<any[]>(`/ops/alerts?status=${tab}`);
    setList(r || []);
  };
  useEffect(() => { load(); }, [tab]);

  const setStatus = async (id: string, status: string) => {
    await apiClient.request(`/ops/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> Operational Alerts
          </h1>
          <p className="text-sm text-muted-foreground">Live alerts from drivers, flights, payments and visa pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          {(["open", "acknowledged", "resolved"] as const).map(t => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>{t}</Button>
          ))}
          <Button size="sm" variant="outline" onClick={async () => { await apiClient.request("/ops/alerts/auto-scan", { method: "POST" }); load(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> Scan now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(a => (
          <Card key={a.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold">{a.title}</div>
              <Badge variant="outline" className={SEVERITY[a.severity] || ""}>{a.severity}</Badge>
            </div>
            {a.body && <div className="text-sm text-muted-foreground">{a.body}</div>}
            <div className="text-xs text-muted-foreground">
              {new Date(a.created_at).toLocaleString()} · {a.alert_type}
            </div>
            {tab !== "resolved" && (
              <div className="flex gap-2">
                {tab === "open" && <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "acknowledged")}>Acknowledge</Button>}
                <Button size="sm" onClick={() => setStatus(a.id, "resolved")}>Resolve</Button>
              </div>
            )}
          </Card>
        ))}
        {list.length === 0 && <div className="text-muted-foreground italic col-span-full text-center py-12">No {tab} alerts.</div>}
      </div>
    </div>
  );
}
