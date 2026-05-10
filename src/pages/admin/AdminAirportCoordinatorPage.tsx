import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plane, PlaneTakeoff, Plus, RefreshCw } from "lucide-react";

type Arrival = {
  id: string; direction: string; airport_code: string; airline: string | null;
  flight_number: string; scheduled_at: string; pilgrim_count: number;
  assigned_driver_name: string | null; vehicle_label: string | null;
  pickup_status: string; notes: string | null;
};

const STATUS_TONE: Record<string, string> = {
  scheduled: "bg-slate-400 text-white",
  driver_assigned: "bg-cyan-500 text-white",
  on_route: "bg-emerald-500 text-white",
  arrived: "bg-blue-500 text-white",
  picked: "bg-indigo-500 text-white",
  completed: "bg-slate-700 text-white",
  delayed: "bg-amber-500 text-white",
};

export default function AdminAirportCoordinatorPage() {
  const [direction, setDirection] = useState<"arrival" | "departure">("arrival");
  const [list, setList] = useState<Arrival[]>([]);
  const [form, setForm] = useState({
    airport_code: "JED", airline: "", flight_number: "",
    scheduled_at: "", pilgrim_count: 1, assigned_driver_name: "", vehicle_label: "",
  });

  const load = async () => {
    try {
      const r = await apiClient.request<Arrival[]>(`/ops/arrivals?direction=${direction}`);
      setList(r || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [direction]);

  const create = async () => {
    if (!form.flight_number || !form.scheduled_at) return;
    await apiClient.request("/ops/arrivals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, direction }),
    });
    setForm({ ...form, flight_number: "", scheduled_at: "" });
    load();
  };

  const updateStatus = async (id: string, pickup_status: string) => {
    await apiClient.request(`/ops/arrivals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickup_status, actual_at: pickup_status === "arrived" ? new Date().toISOString() : undefined }),
    });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {direction === "arrival" ? <Plane className="h-6 w-6 text-primary" /> : <PlaneTakeoff className="h-6 w-6 text-primary" />}
            Airport Coordinator — {direction === "arrival" ? "Arrivals" : "Departures"}
          </h1>
          <p className="text-sm text-muted-foreground">JED · MED · DAC · DXB live flight & pickup board.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={direction === "arrival" ? "default" : "outline"} onClick={() => setDirection("arrival")}>Arrivals</Button>
          <Button size="sm" variant={direction === "departure" ? "default" : "outline"} onClick={() => setDirection("departure")}>Departures</Button>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Airport</label>
            <Input value={form.airport_code} onChange={e => setForm({ ...form, airport_code: e.target.value.toUpperCase() })} maxLength={4} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Airline</label>
            <Input value={form.airline} onChange={e => setForm({ ...form, airline: e.target.value })} placeholder="Saudia" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Flight #</label>
            <Input value={form.flight_number} onChange={e => setForm({ ...form, flight_number: e.target.value.toUpperCase() })} placeholder="SV805" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Scheduled</label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Pilgrims</label>
            <Input type="number" min={1} value={form.pilgrim_count} onChange={e => setForm({ ...form, pilgrim_count: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Driver</label>
            <Input value={form.assigned_driver_name} onChange={e => setForm({ ...form, assigned_driver_name: e.target.value })} />
          </div>
          <Button onClick={create}><Plus className="h-4 w-4 mr-1" /> Add flight</Button>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-3">Flight</th>
              <th className="p-3">Airport</th>
              <th className="p-3">Scheduled</th>
              <th className="p-3">Pilgrims</th>
              <th className="p-3">Driver</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-mono font-semibold">{r.airline ? `${r.airline} ` : ""}{r.flight_number}</td>
                <td className="p-3">{r.airport_code}</td>
                <td className="p-3 whitespace-nowrap">{new Date(r.scheduled_at).toLocaleString()}</td>
                <td className="p-3">{r.pilgrim_count}</td>
                <td className="p-3">{r.assigned_driver_name || <span className="text-muted-foreground italic">unassigned</span>}</td>
                <td className="p-3"><Badge className={STATUS_TONE[r.pickup_status] || "bg-slate-500 text-white"}>{r.pickup_status}</Badge></td>
                <td className="p-3">
                  <select
                    className="text-xs border rounded px-2 py-1 bg-background"
                    value={r.pickup_status}
                    onChange={e => updateStatus(r.id, e.target.value)}
                  >
                    {["scheduled","driver_assigned","on_route","arrived","picked","completed","delayed"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No flights scheduled in the last 24 h.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
