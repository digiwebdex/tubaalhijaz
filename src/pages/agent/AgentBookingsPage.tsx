import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAgent } from "@/components/agent/AgentLayout";
import { AgentCard, AgentSectionHeader, StatusPill } from "@/components/agent/AgentUI";
import { Search, Download, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { formatTrackingId } from "@/lib/utils";

const fmtBDT = (n: number) => `৳ ${new Intl.NumberFormat("en-IN").format(n || 0)}`;

export default function AgentBookingsPage() {
  const agent = useAgent();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      const { data } = await apiClient.from("bookings").select("*").eq("supplier_agent_id", agent.id);
      setRows(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, [agent?.id]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => status === "all" || (r.status || "").toLowerCase() === status)
      .filter((r) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return (
          (r.tracking_id || "").toLowerCase().includes(s) ||
          (r.guest_name || "").toLowerCase().includes(s) ||
          (r.guest_phone || "").toLowerCase().includes(s)
        );
      })
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [rows, q, status]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Bookings</h1>
          <p className="text-xs text-slate-400 mt-0.5">{filtered.length} of {rows.length} records</p>
        </div>
      </div>

      <AgentCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tracking ID, guest name, phone…"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-[hsl(220_50%_7%)] border border-amber-500/20 text-sm text-amber-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-[hsl(220_50%_7%)] border border-amber-500/20 text-sm text-amber-100"
          >
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </AgentCard>

      <AgentCard className="p-4 overflow-hidden">
        {loading ? (
          <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500 py-12 text-center">No bookings match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="text-left px-2 py-2">Tracking</th>
                  <th className="text-left px-2 py-2">Guest</th>
                  <th className="text-left px-2 py-2">Phone</th>
                  <th className="text-right px-2 py-2">Pax</th>
                  <th className="text-right px-2 py-2">Total</th>
                  <th className="text-right px-2 py-2">Paid</th>
                  <th className="text-right px-2 py-2">Due</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-right px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-amber-500/5">
                    <td className="px-2 py-2 font-mono text-xs text-amber-300">{formatTrackingId(b.tracking_id)}</td>
                    <td className="px-2 py-2 text-slate-200 truncate max-w-[180px]">{b.guest_name || "—"}</td>
                    <td className="px-2 py-2 text-slate-400 text-xs">{b.guest_phone || "—"}</td>
                    <td className="px-2 py-2 text-right text-slate-300 tabular-nums">{b.num_travelers}</td>
                    <td className="px-2 py-2 text-right text-slate-200 tabular-nums">{fmtBDT(Number(b.total_amount))}</td>
                    <td className="px-2 py-2 text-right text-emerald-300 tabular-nums">{fmtBDT(Number(b.paid_amount))}</td>
                    <td className="px-2 py-2 text-right text-rose-300 tabular-nums">{fmtBDT(Number(b.due_amount || 0))}</td>
                    <td className="px-2 py-2"><StatusPill status={b.status} /></td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/track?id=${encodeURIComponent(b.tracking_id)}`}
                          className="p-1.5 rounded hover:bg-amber-500/10 text-amber-300"
                          title="Track"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <a
                          href={`/admin/invoices/${b.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded hover:bg-amber-500/10 text-amber-300"
                          title="Invoice"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AgentCard>
    </div>
  );
}
