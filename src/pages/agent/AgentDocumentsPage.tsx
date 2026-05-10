import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAgent } from "@/components/agent/AgentLayout";
import { AgentCard, AgentSectionHeader, StatusPill } from "@/components/agent/AgentUI";
import { FileText } from "lucide-react";

export default function AgentDocumentsPage() {
  const agent = useAgent();
  const [docs, setDocs] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      const { data: bks } = await apiClient.from("bookings").select("*").eq("supplier_agent_id", agent.id);
      const list = Array.isArray(bks) ? bks : [];
      setBookings(list);
      if (list.length === 0) { setLoading(false); return; }
      const results = await Promise.all(
        list.map((b: any) => apiClient.from("booking_documents").select("*").eq("booking_id", b.id))
      );
      setDocs(results.flatMap((r) => (Array.isArray(r.data) ? r.data : [])));
      setLoading(false);
    })();
  }, [agent?.id]);

  const bMap = new Map(bookings.map((b) => [b.id, b]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-amber-100">Documents</h1>
        <p className="text-xs text-slate-400 mt-0.5">Passport, visa & supporting files</p>
      </div>

      <AgentCard className="p-4">
        {loading ? (
          <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
        ) : docs.length === 0 ? (
          <div className="text-sm text-slate-500 py-12 text-center">No documents uploaded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="text-left px-2 py-2">Booking</th>
                  <th className="text-left px-2 py-2">Type</th>
                  <th className="text-left px-2 py-2">File</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-left px-2 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {docs.map((d) => {
                  const b = bMap.get(d.booking_id);
                  return (
                    <tr key={d.id} className="hover:bg-amber-500/5">
                      <td className="px-2 py-2 text-amber-300 font-mono text-xs">{b?.tracking_id || "—"}</td>
                      <td className="px-2 py-2 text-slate-200 capitalize">{d.document_type}</td>
                      <td className="px-2 py-2 text-slate-400 truncate max-w-[200px] flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span className="truncate">{d.file_name}</span>
                      </td>
                      <td className="px-2 py-2"><StatusPill status={d.verification_status || "pending"} /></td>
                      <td className="px-2 py-2 text-slate-400 text-xs truncate max-w-[240px]">{d.verification_notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AgentCard>
    </div>
  );
}
