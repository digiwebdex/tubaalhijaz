import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Phone, MessageCircle, Navigation, CheckCircle2 } from "lucide-react";

const STATUSES = ["accepted", "in_progress", "arrived", "completed"];

export default function DriverTripsPage() {
  const [data, setData] = useState<any>({ movements: [], arrivals: [], driver_name: "" });
  const load = () => apiClient.request("/ops/driver/my-trips").then(setData).catch(console.error);
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);

  const setMoveStatus = async (id: string, status: string) => {
    await apiClient.request(`/ops/driver/movement/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-amber-400/80 text-xs uppercase tracking-widest">Welcome</div>
        <h1 className="text-xl font-bold">{data.driver_name || "Driver"}</h1>
      </div>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2">Today's movements</h2>
        <div className="space-y-3">
          {data.movements.length === 0 && <div className="text-slate-500 italic text-sm">No assigned trips.</div>}
          {data.movements.map((m: any) => (
            <div key={m.id} className="rounded-xl border border-amber-500/20 bg-slate-900 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{m.from_location} → {m.to_location}</div>
                  <div className="text-xs text-slate-400">
                    {m.movement_date} · {m.movement_time || "—"} · {m.vehicle || "vehicle"}
                  </div>
                  {m.lead_pilgrim_name && (
                    <div className="text-xs text-amber-300 mt-1">
                      {m.lead_pilgrim_name} ({m.num_pilgrims} pax) · {m.tracking_id}
                    </div>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase bg-amber-500/20 text-amber-300">
                  {m.status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <a href="tel:" className="flex flex-col items-center gap-1 py-2 rounded-lg bg-slate-800">
                  <Phone className="h-4 w-4" /> Call
                </a>
                <a href="https://wa.me/" target="_blank" className="flex flex-col items-center gap-1 py-2 rounded-lg bg-slate-800">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(m.to_location)}`}
                   target="_blank" className="flex flex-col items-center gap-1 py-2 rounded-lg bg-slate-800">
                  <Navigation className="h-4 w-4" /> Navigate
                </a>
                <button onClick={() => setMoveStatus(m.id, "completed")}
                  className="flex flex-col items-center gap-1 py-2 rounded-lg bg-emerald-600 text-white">
                  <CheckCircle2 className="h-4 w-4" /> Done
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => setMoveStatus(m.id, s)}
                    className={`text-[11px] px-2 py-1 rounded-full ${m.status === s ? "bg-amber-500 text-slate-900 font-bold" : "bg-slate-800 text-slate-300"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {data.arrivals.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-2">Airport pickups</h2>
          <div className="space-y-2">
            {data.arrivals.map((a: any) => (
              <div key={a.id} className="rounded-xl border border-cyan-500/30 bg-slate-900 p-3 text-sm">
                <div className="font-semibold">{a.airline || ""} {a.flight_number} · {a.airport_code}</div>
                <div className="text-xs text-slate-400">{new Date(a.scheduled_at).toLocaleString()} · {a.pilgrim_count} pax</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
