import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Search, Eye, Download, X } from "lucide-react";
import { useIsViewer } from "@/components/admin/AdminLayout";

const STATUSES = ["pending", "contacted", "quoted", "confirmed", "completed", "cancelled"];

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  contacted: "bg-blue-500/15 text-blue-600",
  quoted: "bg-violet-500/15 text-violet-600",
  confirmed: "bg-emerald-500/15 text-emerald-600",
  completed: "bg-primary/15 text-primary",
  cancelled: "bg-destructive/15 text-destructive",
};

export default function AdminUmrahOrdersPage() {
  const isViewer = useIsViewer();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [active, setActive] = useState<any | null>(null);
  const [notes, setNotes] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await apiClient
      .from("umrah_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (tierFilter !== "all" && r.program_tier !== tierFilter) return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          (r.tracking_id || "").toLowerCase().includes(s) ||
          (r.guest_name || "").toLowerCase().includes(s) ||
          (r.guest_phone || "").toLowerCase().includes(s) ||
          (r.guest_email || "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [rows, q, statusFilter, tierFilter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await apiClient.from("umrah_orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    fetchAll();
    if (active?.id === id) setActive({ ...active, status });
  };

  const saveNotes = async () => {
    if (!active) return;
    const { error } = await apiClient.from("umrah_orders").update({ internal_notes: notes }).eq("id", active.id);
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
    setActive({ ...active, internal_notes: notes });
    fetchAll();
  };

  const openDetail = (r: any) => {
    setActive(r);
    setNotes(r.internal_notes || "");
  };

  const exportCsv = () => {
    const headers = ["tracking_id","status","program_tier","travel_month","num_travelers","guest_name","guest_phone","guest_email","estimated_price_sar","estimated_price_bdt","created_at"];
    const csv = [headers.join(",")].concat(
      filtered.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `umrah-orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Umrah Orders</h1>
          <p className="text-sm text-muted-foreground">Online quote requests submitted from the website.</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm hover:bg-muted">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tracking / name / phone…" className="w-full bg-secondary border border-border rounded-md pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm">
          <option value="all">All status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm">
          <option value="all">All tiers</option>
          {["economic","silver","golden","platinum"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Tracking</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Tier</th>
              <th className="text-left p-3">Travelers</th>
              <th className="text-left p-3">Estimate</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No orders found</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3 font-mono text-xs">{r.tracking_id}</td>
                <td className="p-3">
                  <div className="font-medium">{r.guest_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.guest_phone}</div>
                </td>
                <td className="p-3 capitalize">{r.program_tier}</td>
                <td className="p-3 tabular-nums">{r.num_travelers}</td>
                <td className="p-3 tabular-nums">SAR {Number(r.estimated_price_sar).toLocaleString()}</td>
                <td className="p-3">
                  <select
                    disabled={isViewer}
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                    className={`px-2 py-1 text-xs rounded border-0 ${statusColor[r.status] || "bg-muted"}`}
                  >
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => openDetail(r)} className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={() => setActive(null)}>
          <div className="bg-background w-full max-w-lg h-full overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold">Order Details</h2>
              <button onClick={() => setActive(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-1 text-sm">
              <Row label="Tracking" value={<span className="font-mono">{active.tracking_id}</span>} />
              <Row label="Status" value={<span className="capitalize">{active.status}</span>} />
              <Row label="Created" value={new Date(active.created_at).toLocaleString()} />
            </div>
            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <Row label="Name" value={active.guest_name} />
              <Row label="Phone" value={active.guest_phone} />
              <Row label="Email" value={active.guest_email || "—"} />
              <Row label="Passport ready" value={active.passport_ready ? "Yes" : "No"} />
            </div>
            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <Row label="Tier" value={<span className="capitalize">{active.program_tier}</span>} />
              <Row label="Travel month" value={active.travel_month || "—"} />
              <Row label="Travelers" value={active.num_travelers} />
              <Row label="Room" value={active.room_type} />
              <Row label="Makkah / Madinah nights" value={`${active.makkah_nights} / ${active.madinah_nights}`} />
              <Row label="Visa" value={active.include_visa ? "✓" : "—"} />
              <Row label="Hotel" value={active.include_hotel ? "✓" : "—"} />
              <Row label="Transport" value={active.transport_vehicle} />
              <Row label="Ziyarat" value={active.include_ziyarat ? "✓" : "—"} />
              <Row label="Reception" value={active.include_reception ? "✓" : "—"} />
            </div>
            {active.special_requests && (
              <div className="border-t border-border pt-3 text-sm">
                <div className="text-xs text-muted-foreground mb-1">Special requests</div>
                <p className="whitespace-pre-wrap">{active.special_requests}</p>
              </div>
            )}
            <div className="border-t border-border pt-3">
              <div className="rounded-xl p-4 bg-gradient-gold text-primary-foreground">
                <div className="text-xs uppercase tracking-widest opacity-80">Estimated price</div>
                <div className="font-heading text-2xl font-bold tabular-nums">SAR {Number(active.estimated_price_sar).toLocaleString()}</div>
                <div className="text-xs opacity-80 tabular-nums">≈ BDT {Number(active.estimated_price_bdt).toLocaleString("en-IN")}</div>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <label className="text-xs text-muted-foreground mb-1 block">Internal notes</label>
              <textarea rows={4} className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isViewer} />
              {!isViewer && (
                <button onClick={saveNotes} className="mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Save notes</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: any }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);
