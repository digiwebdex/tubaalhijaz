import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAgent } from "@/components/agent/AgentLayout";
import { AgentCard, AgentSectionHeader, StatusPill } from "@/components/agent/AgentUI";
import { Plane, MapPin, User, Phone } from "lucide-react";

export default function AgentOperationsPage() {
  const agent = useAgent();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      const { data } = await apiClient.from("bookings").select("*").eq("supplier_agent_id", agent.id);
      const list = (Array.isArray(data) ? data : []).filter((b: any) => b.status !== "cancelled");
      setBookings(list);
      setLoading(false);
    })();
  }, [agent?.id]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-amber-100">Live Operations</h1>
        <p className="text-xs text-slate-400 mt-0.5">Transport, drivers and pickup tracking</p>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : bookings.length === 0 ? (
        <AgentCard className="p-12 text-center text-sm text-slate-500">No active operations.</AgentCard>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {bookings.map((b) => (
            <AgentCard key={b.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-amber-300 font-mono">{b.tracking_id}</div>
                  <div className="text-base text-amber-100 font-semibold mt-0.5">{b.guest_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{b.num_travelers} pilgrim(s)</div>
                </div>
                <StatusPill status={b.status} />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Driver:</span>
                  <span>{b.driver_name || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Phone:</span>
                  <span>{b.driver_phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Plane className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Vehicle:</span>
                  <span>{b.vehicle_number || "—"}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 mt-0.5" />
                  <span className="text-slate-400">Pickup:</span>
                  <span className="flex-1">{b.pickup_location || "—"}{b.pickup_time ? ` · ${new Date(b.pickup_time).toLocaleString()}` : ""}</span>
                </div>
              </div>
            </AgentCard>
          ))}
        </div>
      )}
    </div>
  );
}
