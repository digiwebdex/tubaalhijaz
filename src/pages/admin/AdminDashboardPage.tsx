import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/apiClient";
import AdminDashboardCharts from "@/components/AdminDashboardCharts";
import { Card } from "@/components/ui/card";
import {
  Users, Plane, FileText, UtensilsCrossed, FileCheck, Hotel,
  PlaneTakeoff, PlaneLanding, AlertCircle, Wallet,
} from "lucide-react";
import { formatBDT } from "@/lib/utils";

interface OpsKpi {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  sub?: string;
}

export default function AdminDashboardPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [moallemPayments, setMoallemPayments] = useState<any[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<any[]>([]);
  const [moallems, setMoallems] = useState<any[]>([]);
  const [supplierAgents, setSupplierAgents] = useState<any[]>([]);
  const [supplierContracts, setSupplierContracts] = useState<any[]>([]);
  const [supplierContractPayments, setSupplierContractPaymentsState] = useState<any[]>([]);
  const [dailyCashbook, setDailyCashbook] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [bk, py, ex, ac, fs, mp, sp, cp, ml, sa, sc, scp, dcb] = await Promise.all([
      apiClient.from("bookings").select("*, packages(name, type)").order("created_at", { ascending: false }),
      apiClient.from("payments").select("*, bookings(tracking_id)").order("created_at", { ascending: false }),
      apiClient.from("expenses").select("*").order("date", { ascending: false }),
      apiClient.from("accounts").select("*"),
      apiClient.from("financial_summary").select("*").limit(1).maybeSingle(),
      apiClient.from("moallem_payments").select("*, moallems(name)").order("created_at", { ascending: false }),
      apiClient.from("supplier_agent_payments").select("*, supplier_agents(agent_name)").order("created_at", { ascending: false }),
      apiClient.from("moallem_commission_payments").select("*, moallems(name)").order("created_at", { ascending: false }),
      apiClient.from("moallems").select("*"),
      apiClient.from("supplier_agents").select("*"),
      apiClient.from("supplier_contracts").select("*"),
      apiClient.from("supplier_contract_payments").select("*").order("created_at", { ascending: false }),
      apiClient.from("daily_cashbook").select("*").order("date", { ascending: false }),
    ]);
    setBookings(bk.data || []);
    setPayments(py.data || []);
    setExpenses(ex.data || []);
    setAccounts((ac.data as any[]) || []);
    setFinancialSummary(fs.data || null);
    setMoallemPayments(mp.data || []);
    setSupplierPayments(sp.data || []);
    setCommissionPayments(cp.data || []);
    setMoallems(ml.data || []);
    setSupplierAgents(sa.data || []);
    setSupplierContracts(sc.data || []);
    setSupplierContractPaymentsState(scp.data || []);
    setDailyCashbook(dcb.data || []);
  };

  const markPaymentCompleted = async (paymentId: string) => {
    const { error } = await apiClient.from("payments").update({ status: "completed", paid_at: new Date().toISOString() }).eq("id", paymentId);
    if (error) return;
    fetchData();
  };

  const opsKpis: OpsKpi[] = useMemo(() => {
    const active = bookings.filter(b => b.status !== "cancelled");
    const totalPilgrims = active.reduce((s, b) => s + Number(b.num_travelers || 0), 0);
    const totalBookings = active.length;
    const activeGroups = new Set(active.map(b => b.group_name || b.package_id).filter(Boolean)).size;
    const visaPending = active.filter(b => (b.visa_status || "pending") === "pending").length;
    const totalPayments = payments
      .filter(p => p.status === "completed")
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const due = active.reduce((s, b) => s + Number(b.due_amount || 0), 0);

    const today = new Date().toISOString().slice(0, 10);
    const arrivalsToday = active.filter(b => (b.arrival_date || "").startsWith(today)).length;
    const departuresToday = active.filter(b => (b.departure_date || "").startsWith(today)).length;
    const cateringActive = active.filter(b => b.has_catering || b.catering_amount).length;

    return [
      { label: "Total Pilgrims",    value: totalPilgrims,        icon: Users,         accent: "from-amber-500/15 to-amber-500/5 text-amber-700",   sub: `${totalBookings} bookings` },
      { label: "Active Groups",     value: activeGroups,         icon: Plane,         accent: "from-emerald-600/15 to-emerald-600/5 text-emerald-700" },
      { label: "Umrah Bookings",    value: totalBookings,        icon: FileText,      accent: "from-primary/15 to-primary/5 text-primary" },
      { label: "Catering Orders",   value: cateringActive,       icon: UtensilsCrossed, accent: "from-orange-500/15 to-orange-500/5 text-orange-700" },
      { label: "Visa Pending",      value: visaPending,          icon: FileCheck,     accent: "from-rose-500/15 to-rose-500/5 text-rose-700" },
      { label: "Hotel Occupancy",   value: `${totalPilgrims}`,   icon: Hotel,         accent: "from-indigo-500/15 to-indigo-500/5 text-indigo-700", sub: "active rooms" },
      { label: "Arrivals Today",    value: arrivalsToday,        icon: PlaneLanding,  accent: "from-sky-500/15 to-sky-500/5 text-sky-700" },
      { label: "Departures Today",  value: departuresToday,      icon: PlaneTakeoff,  accent: "from-cyan-500/15 to-cyan-500/5 text-cyan-700" },
      { label: "Pending Payments",  value: formatBDT(due),       icon: AlertCircle,   accent: "from-red-500/15 to-red-500/5 text-red-700",       sub: "due amount" },
      { label: "Revenue (BDT)",     value: formatBDT(totalPayments), icon: Wallet,    accent: "from-teal-600/15 to-teal-600/5 text-teal-700" },
    ];
  }, [bookings, payments]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Operational header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-gradient-gold">
            Tuba Al Hijaz — Operations Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time overview of Umrah operations, pilgrim flow, logistics, and revenue.
          </p>
        </div>
        <div className="text-xs text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full border border-primary/10">
          {new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Operational KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {opsKpis.map((k) => (
          <Card key={k.label} className={`p-4 bg-gradient-to-br ${k.accent} border-primary/10 hover:shadow-luxury transition-all`}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold opacity-80">{k.label}</span>
              <k.icon className="h-4 w-4 opacity-70" />
            </div>
            <div className="text-2xl font-bold tabular-nums leading-tight">{k.value}</div>
            {k.sub && <div className="text-[11px] opacity-70 mt-1">{k.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Existing financial dashboard */}
      <AdminDashboardCharts
        bookings={bookings}
        payments={payments}
        expenses={expenses}
        accounts={accounts}
        financialSummary={financialSummary}
        moallemPayments={moallemPayments}
        supplierPayments={supplierPayments}
        commissionPayments={commissionPayments}
        moallems={moallems}
        supplierAgents={supplierAgents}
        supplierContracts={supplierContracts}
        supplierContractPayments={supplierContractPayments}
        dailyCashbook={dailyCashbook}
        onMarkPaid={markPaymentCompleted}
      />
    </div>
  );
}
