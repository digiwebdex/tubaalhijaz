import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiClient } from "@/lib/apiClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Activity, RefreshCw, AlertTriangle } from "lucide-react";

// Fix default marker icons (Vite doesn't bundle them automatically)
const driverIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:34px;height:34px;border-radius:50%;background:hsl(var(--primary));border:3px solid #fff;box-shadow:0 0 0 4px hsl(var(--primary)/0.35),0 4px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">▲</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Saudi default center (Makkah ⇄ Madinah midpoint)
const DEFAULT_CENTER: [number, number] = [22.5, 40.0];

type LivePing = {
  id: string;
  driver_user_id: string | null;
  driver_name: string | null;
  vehicle_label: string | null;
  lat: number; lng: number;
  speed_kmh: number | null;
  status: string;
  recorded_at: string;
  movement_id: string | null;
};

const STATUS_TONE: Record<string, string> = {
  on_route: "bg-emerald-500",
  arrived: "bg-blue-500",
  delayed: "bg-amber-500",
  offline: "bg-gray-400",
  completed: "bg-slate-500",
  scheduled: "bg-slate-400",
  accepted: "bg-cyan-500",
};

function FitBounds({ pings }: { pings: LivePing[] }) {
  const map = useMap();
  useEffect(() => {
    if (!pings.length) return;
    const bounds = L.latLngBounds(pings.map(p => [Number(p.lat), Number(p.lng)] as [number, number]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }, [pings, map]);
  return null;
}

export default function AdminLiveOperationsMapPage() {
  const [pings, setPings] = useState<LivePing[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const timerRef = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [live, alertList] = await Promise.all([
        apiClient.request<LivePing[]>("/ops/tracking/live"),
        apiClient.request<any[]>("/ops/alerts?status=open"),
      ]);
      setPings(live || []);
      setAlerts(alertList || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, 20000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const filtered = filter === "all" ? pings : pings.filter(p => p.status === filter);
  const statuses = Array.from(new Set(pings.map(p => p.status)));

  const runScan = async () => {
    try {
      await apiClient.request("/ops/alerts/auto-scan", { method: "POST" });
      load();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Live Operations Map
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time vehicle, driver and pickup tracking across Makkah, Madinah & airports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={runScan}>
            <AlertTriangle className="h-4 w-4 mr-1" /> Scan alerts
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 p-0 overflow-hidden border-primary/20" style={{ height: 600 }}>
          <MapContainer center={DEFAULT_CENTER} zoom={6} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map(p => (
              <Marker key={p.id} position={[Number(p.lat), Number(p.lng)]} icon={driverIcon}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold">{p.driver_name || "Driver"}</div>
                    <div>{p.vehicle_label || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.speed_kmh ? `${p.speed_kmh} km/h` : "stopped"} ·{" "}
                      {new Date(p.recorded_at).toLocaleTimeString()}
                    </div>
                    <Badge className={`mt-1 ${STATUS_TONE[p.status] || "bg-slate-500"} text-white`}>
                      {p.status}
                    </Badge>
                  </div>
                </Popup>
              </Marker>
            ))}
            <FitBounds pings={filtered} />
          </MapContainer>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              Filter by status
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                onClick={() => setFilter("all")}
                className={`cursor-pointer ${filter === "all" ? "bg-primary" : "bg-muted text-foreground"}`}
              >
                All ({pings.length})
              </Badge>
              {statuses.map(s => (
                <Badge
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`cursor-pointer ${filter === s ? STATUS_TONE[s] + " text-white" : "bg-muted text-foreground"}`}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Live alerts ({alerts.length})
            </h3>
            <div className="space-y-2 max-h-72 overflow-auto">
              {alerts.length === 0 && (
                <div className="text-xs text-muted-foreground italic">No open alerts.</div>
              )}
              {alerts.map(a => (
                <div key={a.id} className="border rounded-md p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{a.title}</span>
                    <Badge variant="outline" className={
                      a.severity === "critical" ? "border-red-500 text-red-600" :
                      a.severity === "warning" ? "border-amber-500 text-amber-600" :
                      "border-slate-400 text-slate-600"
                    }>{a.severity}</Badge>
                  </div>
                  {a.body && <div className="text-muted-foreground mt-1">{a.body}</div>}
                  <Button
                    size="sm" variant="ghost" className="h-6 px-2 text-xs mt-1"
                    onClick={async () => {
                      await apiClient.request(`/ops/alerts/${a.id}`, {
                        method: "PATCH", body: JSON.stringify({ status: "resolved" }),
                        headers: { "Content-Type": "application/json" },
                      });
                      load();
                    }}
                  >Resolve</Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Active drivers
            </h3>
            <div className="space-y-1.5 max-h-60 overflow-auto text-xs">
              {pings.length === 0 && (
                <div className="text-muted-foreground italic">No live drivers in last 30 min.</div>
              )}
              {pings.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.driver_name || "Driver"}</div>
                    <div className="text-muted-foreground">{p.vehicle_label || "—"}</div>
                  </div>
                  <Badge className={`${STATUS_TONE[p.status] || "bg-slate-500"} text-white`}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
