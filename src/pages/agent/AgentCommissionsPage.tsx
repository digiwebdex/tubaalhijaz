import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAgent } from "@/components/agent/AgentLayout";
import { AgentCard, AgentKpi, AgentSectionHeader, StatusPill } from "@/components/agent/AgentUI";
import { Wallet, TrendingUp, CreditCard, CheckCircle2 } from "lucide-react";

const fmtBDT = (n: number) => `৳ ${new Intl.NumberFormat("en-IN").format(n || 0)}`;

export default function AgentCommissionsPage() {
  const agent = useAgent();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agent?.id) return;
    (async () => {
      const [c, p] = await Promise.all([
        apiClient.from("agent_commissions").select("*").eq("supplier_agent_id", agent.id),
        apiClient.from("commission_payouts").select("*").eq("supplier_agent_id", agent.id),
      ]);
      setCommissions(Array.isArray(c.data) ? c.data : []);
      setPayouts(Array.isArray(p.data) ? p.data : []);
      setLoading(false);
    })();
  }, [agent?.id]);

  const totals = useMemo(() => {
    const earned = commissions.reduce((s, c) => s + Number(c.commission_amount || 0), 0);
    const paid = commissions.reduce((s, c) => s + Number(c.paid_amount || 0), 0);
    const payoutSum = payouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { earned, paid, pending: Math.max(0, earned - paid), payoutSum };
  }, [commissions, payouts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-100">Commissions</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Rate: <span className="text-amber-300 font-semibold">{agent?.commission_pct ?? 0}%</span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AgentKpi label="Total Earned" value={fmtBDT(totals.earned)} icon={TrendingUp} accent="emerald" />
        <AgentKpi label="Paid" value={fmtBDT(totals.paid)} icon={CheckCircle2} accent="emerald" />
        <AgentKpi label="Pending" value={fmtBDT(totals.pending)} icon={CreditCard} accent="amber" />
        <AgentKpi label="Payouts Received" value={fmtBDT(totals.payoutSum)} icon={Wallet} accent="sky" />
      </div>

      <AgentCard className="p-5">
        <AgentSectionHeader title="Commission Ledger" subtitle="Per-booking earnings" />
        {loading ? (
          <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
        ) : commissions.length === 0 ? (
          <div className="text-sm text-slate-500 py-10 text-center">No commission records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="text-left px-2 py-2">Date</th>
                  <th className="text-right px-2 py-2">Base</th>
                  <th className="text-right px-2 py-2">Rate</th>
                  <th className="text-right px-2 py-2">Earned</th>
                  <th className="text-right px-2 py-2">Paid</th>
                  <th className="text-left px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-amber-500/5">
                    <td className="px-2 py-2 text-slate-300">{(c.created_at || "").split("T")[0]}</td>
                    <td className="px-2 py-2 text-right text-slate-300 tabular-nums">{fmtBDT(Number(c.base_amount))}</td>
                    <td className="px-2 py-2 text-right text-amber-200 tabular-nums">{c.commission_pct}%</td>
                    <td className="px-2 py-2 text-right text-emerald-300 tabular-nums">{fmtBDT(Number(c.commission_amount))}</td>
                    <td className="px-2 py-2 text-right text-slate-200 tabular-nums">{fmtBDT(Number(c.paid_amount))}</td>
                    <td className="px-2 py-2"><StatusPill status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AgentCard>

      <AgentCard className="p-5">
        <AgentSectionHeader title="Payouts" subtitle="History of commission payments to you" />
        {payouts.length === 0 ? (
          <div className="text-sm text-slate-500 py-10 text-center">No payouts recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="text-left px-2 py-2">Date</th>
                  <th className="text-left px-2 py-2">Method</th>
                  <th className="text-left px-2 py-2">Reference</th>
                  <th className="text-right px-2 py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="px-2 py-2 text-slate-300">{p.payout_date}</td>
                    <td className="px-2 py-2 text-slate-300 capitalize">{p.payment_method || "—"}</td>
                    <td className="px-2 py-2 text-slate-400">{p.reference || "—"}</td>
                    <td className="px-2 py-2 text-right text-emerald-300 tabular-nums">{fmtBDT(Number(p.amount))}</td>
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
