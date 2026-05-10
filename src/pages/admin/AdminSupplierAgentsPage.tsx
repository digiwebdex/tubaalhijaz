import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { useIsViewer } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import AdminActionMenu, { ActionItem } from "@/components/admin/AdminActionMenu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Trash2, Eye, Search, Truck, ChevronLeft, ChevronRight,
  FileDown, FileSpreadsheet, Package, Wallet, Phone, Building2, Users2,
  TrendingUp, TrendingDown, CalendarDays
} from "lucide-react";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { normalizePhone, getPhoneError, handlePhoneChange } from "@/lib/phoneValidation";
import { format } from "date-fns";
import { formatBDT, cn } from "@/lib/utils";

const PAGE_SIZE = 15;

interface SupplierAgent {
  id: string; agent_name: string; company_name: string | null; phone: string | null;
  address: string | null; notes: string | null; status: string;
  created_at: string; updated_at: string;
  contracted_amount: number; contracted_hajji: number; contract_date: string | null;
}

const emptyForm = { agent_name: "", company_name: "", phone: "", address: "", notes: "", status: "active", contract_date: "", contracted_hajji: "", contracted_amount: "" };

export default function AdminSupplierAgentsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isViewer = useIsViewer();
  const [agents, setAgents] = useState<SupplierAgent[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [allPaymentsDetailed, setAllPaymentsDetailed] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const [a, p, itemsRes, paymentsDetailRes] = await Promise.all([
      apiClient.from("supplier_agents").select("*").neq("status", "deleted").order("created_at", { ascending: false }),
      apiClient.from("supplier_agent_payments").select("id, supplier_agent_id, amount"),
      apiClient.from("supplier_agent_items").select("*").order("created_at", { ascending: true }),
      apiClient.from("supplier_agent_payments").select("*").order("date", { ascending: false }),
    ]);
    if (a.data) setAgents(a.data as SupplierAgent[]);
    if (p.data) setPayments(p.data);
    setAllItems(itemsRes.data || []);
    setAllPaymentsDetailed(paymentsDetailRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const supplierStats = useMemo(() => {
    const map: Record<string, { totalPaid: number }> = {};
    payments.forEach(p => {
      if (!p.supplier_agent_id) return;
      if (!map[p.supplier_agent_id]) map[p.supplier_agent_id] = { totalPaid: 0 };
      map[p.supplier_agent_id].totalPaid += Number(p.amount || 0);
    });
    return map;
  }, [payments]);

  const getStats = (a: SupplierAgent) => {
    const totalPaid = supplierStats[a.id]?.totalPaid || 0;
    const contractedAmount = Number(a.contracted_amount || 0);
    const totalDue = Math.max(0, contractedAmount - totalPaid);
    return { contractedAmount, totalPaid, totalDue };
  };

  const handleSave = async () => {
    if (!form.agent_name.trim()) { toast({ title: "Agent name is required.", variant: "destructive" }); return; }
    if (form.phone.trim()) {
      const phoneErr = getPhoneError(form.phone);
      if (phoneErr) { toast({ title: phoneErr, variant: "destructive" }); return; }
    }
    const payload = {
      agent_name: form.agent_name.trim(), company_name: form.company_name.trim() || null,
      phone: form.phone.trim() ? normalizePhone(form.phone) : null, address: form.address.trim() || null,
      notes: form.notes.trim() || null, status: form.status,
      contract_date: form.contract_date || null,
      contracted_hajji: form.contracted_hajji ? Number(form.contracted_hajji) : 0,
      contracted_amount: form.contracted_amount ? Number(form.contracted_amount) : 0,
    };
    if (editId) {
      const { error } = await apiClient.from("supplier_agents").update(payload).eq("id", editId);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Supplier agent updated successfully" });
    } else {
      const { error } = await apiClient.from("supplier_agents").insert(payload);
      if (error) { toast({ title: "Creation failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Supplier agent created successfully" });
    }
    setShowForm(false); setEditId(null); setForm(emptyForm); fetchData();
  };

  const startEdit = (a: SupplierAgent) => {
    setForm({ agent_name: a.agent_name, company_name: a.company_name || "", phone: a.phone || "", address: a.address || "", notes: a.notes || "", status: a.status, contract_date: a.contract_date || "", contracted_hajji: String(a.contracted_hajji || ""), contracted_amount: String(a.contracted_amount || "") });
    setEditId(a.id); setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await apiClient.from("supplier_agents").update({ status: "deleted" }).eq("id", deleteId);
    if (error) { toast({ title: "Failed to delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Supplier agent deleted successfully" }); setDeleteId(null); fetchData();
  };

  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    return a.agent_name.toLowerCase().includes(q) || (a.company_name || "").toLowerCase().includes(q) || (a.phone || "").includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const getActions = (a: SupplierAgent): ActionItem[] => {
    const stats = getStats(a);
    return [
      { label: "View", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate(`/admin/supplier-agents/${a.id}`) },
      { label: "PDF", icon: <FileDown className="h-3.5 w-3.5" />, onClick: () => exportPDF({ title: `Supplier - ${a.agent_name}`, columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows: [[a.agent_name, a.phone || "—", a.contracted_hajji || 0, stats.contractedAmount, stats.totalPaid, stats.totalDue]], summary: [`Total Paid: BDT ${stats.totalPaid.toLocaleString("en-IN")}`, `Total Due: BDT ${stats.totalDue.toLocaleString("en-IN")}`] }) },
      { label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => startEdit(a), variant: "warning", hidden: isViewer },
      { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteId(a.id), variant: "destructive", hidden: isViewer, separator: true },
    ];
  };

  const totals = useMemo(() => {
    let totalContracted = 0, totalPaid = 0, totalDue = 0;
    filtered.forEach(a => { const s = getStats(a); totalContracted += s.contractedAmount; totalPaid += s.totalPaid; totalDue += s.totalDue; });
    return { totalContracted, totalPaid, totalDue };
  }, [filtered, supplierStats]);

  const agentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    agents.forEach(a => { map[a.id] = a.agent_name; });
    return map;
  }, [agents]);

  const itemsWithNames = useMemo(() => allItems.map(item => ({ ...item, agent_name: agentNameMap[item.supplier_agent_id] || "—" })), [allItems, agentNameMap]);
  const itemsGrandTotal = useMemo(() => allItems.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0), [allItems]);

  const paymentsWithNames = useMemo(() => allPaymentsDetailed.map(p => ({ ...p, agent_name: agentNameMap[p.supplier_agent_id] || "—" })), [allPaymentsDetailed, agentNameMap]);
  const paymentsGrandTotal = useMemo(() => allPaymentsDetailed.reduce((s: number, p: any) => s + Number(p.amount || 0), 0), [allPaymentsDetailed]);

  const inputClass = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Supplier Agents
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {agents.length} {agents.length === 1 ? "supplier" : "suppliers"} registered
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { const rows = filtered.map(a => { const s = getStats(a); return [a.agent_name, a.phone || "—", Number(a.contracted_hajji || 0), s.contractedAmount, s.totalPaid, s.totalDue]; }); exportPDF({ title: "Supplier Agents Report", columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows, summary: [`Total Paid: BDT ${totals.totalPaid.toLocaleString("en-IN")}`, `Total Due: BDT ${totals.totalDue.toLocaleString("en-IN")}`] }); }}>
            <FileDown className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => { const rows = filtered.map(a => { const s = getStats(a); return [a.agent_name, a.phone || "—", Number(a.contracted_hajji || 0), s.contractedAmount, s.totalPaid, s.totalDue]; }); exportExcel({ title: "Supplier Agents Report", columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows, summary: [`Total Paid: BDT ${totals.totalPaid.toLocaleString("en-IN")}`, `Total Due: BDT ${totals.totalDue.toLocaleString("en-IN")}`] }); }}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
          </Button>
          {!isViewer && (
            <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" /> New Agent
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Agents", value: String(agents.length), icon: <Users2 className="h-5 w-5" />, color: "text-primary" },
          { label: "Contracted Amount", value: formatBDT(totals.totalContracted), icon: <Building2 className="h-5 w-5" />, color: "text-foreground" },
          { label: "Total Paid", value: formatBDT(totals.totalPaid), icon: <TrendingUp className="h-5 w-5" />, color: "text-emerald-600" },
          { label: "Total Due", value: formatBDT(totals.totalDue), icon: <TrendingDown className="h-5 w-5" />, color: "text-destructive" },
        ].map((kpi, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 flex items-start justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{kpi.label}</p>
              <p className={cn("text-xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* Agents Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-heading text-lg font-bold">All Agents ({filtered.length})</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className={inputClass + " pl-9"} placeholder="Search by name, company or phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No supplier agents found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agent</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilgrims</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contract</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginated.map((a) => {
                  const stats = getStats(a);
                  const isPaidFull = stats.totalDue <= 0 && stats.contractedAmount > 0;
                  return (
                    <tr key={a.id} className="hover:bg-secondary/30 transition-colors cursor-pointer group" onClick={() => navigate(`/admin/supplier-agents/${a.id}`)}>
                      <td className="py-3 px-3">
                        <div className="min-w-[140px]">
                          <p className="font-semibold text-sm leading-tight">{a.agent_name}</p>
                          {a.company_name && <p className="text-[11px] text-muted-foreground mt-0.5">{a.company_name}</p>}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-sm text-muted-foreground">{a.phone || "—"}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-sm font-medium">{a.contracted_hajji || 0}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-bold">৳{Number(stats.contractedAmount).toLocaleString("en-IN")}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-semibold text-emerald-600">৳{Number(stats.totalPaid).toLocaleString("en-IN")}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={cn("text-sm font-semibold", stats.totalDue > 0 ? "text-destructive" : "text-muted-foreground")}>
                          ৳{Number(stats.totalDue).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize",
                          a.status === "active"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-secondary text-muted-foreground border-border"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", a.status === "active" ? "bg-emerald-500" : "bg-muted-foreground")} />
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <AdminActionMenu actions={getActions(a)} inlineCount={0} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Service Items Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-heading text-base font-bold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> All Service / Items ({itemsWithNames.length})
          </h2>
          <span className="text-sm font-bold text-primary">Total: {formatBDT(itemsGrandTotal)}</span>
        </div>
        {itemsWithNames.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No service items recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase w-10">SL</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Agent</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Qty</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Rate</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {itemsWithNames.map((item: any, i: number) => (
                  <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="text-center py-2.5 px-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="py-2.5 px-3 font-medium">{item.description}</td>
                    <td className="py-2.5 px-3 text-primary text-sm font-medium">{item.agent_name}</td>
                    <td className="text-center py-2.5 px-3">{item.quantity}</td>
                    <td className="text-right py-2.5 px-3">{formatBDT(item.unit_price)}</td>
                    <td className="text-right py-2.5 px-3 font-bold">{formatBDT(item.total_amount)}</td>
                    <td className="text-center py-2.5 px-3 text-xs text-muted-foreground">{item.created_at ? format(new Date(item.created_at), "dd MMM yyyy") : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-bold border-t border-border">
                  <td colSpan={5} className="text-right py-3 px-3 text-sm">Grand Total</td>
                  <td className="text-right py-3 px-3 text-primary text-sm">{formatBDT(itemsGrandTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Payment History Card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-heading text-base font-bold flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> All Payment History ({paymentsWithNames.length})
          </h2>
          <span className="text-sm font-bold text-emerald-600">Total Paid: {formatBDT(paymentsGrandTotal)}</span>
        </div>
        {paymentsWithNames.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No payments recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase w-10">SL</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Agent</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                  <th className="text-center py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Method</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paymentsWithNames.map((p: any, i: number) => (
                  <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="text-center py-2.5 px-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-primary">{p.agent_name}</td>
                    <td className="text-center py-2.5 px-3 text-sm">{p.date ? format(new Date(p.date), "dd MMM yyyy") : "—"}</td>
                    <td className="text-right py-2.5 px-3 font-bold text-emerald-600">{formatBDT(p.amount)}</td>
                    <td className="text-center py-2.5 px-3">
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground capitalize">{p.payment_method || "—"}</span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[200px] truncate">{p.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-bold border-t border-border">
                  <td colSpan={3} className="text-right py-3 px-3 text-sm">Grand Total</td>
                  <td className="text-right py-3 px-3 text-emerald-600 text-sm">{formatBDT(paymentsGrandTotal)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="bg-card border-2 border-primary/20 rounded-xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 text-center">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Service Billed</p>
            <p className="text-xl font-bold mt-1">{formatBDT(itemsGrandTotal)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Paid</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatBDT(paymentsGrandTotal)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Outstanding Due</p>
            <p className="text-xl font-bold text-destructive mt-1">{formatBDT(Math.max(0, itemsGrandTotal - paymentsGrandTotal))}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Active Agents</p>
            <p className="text-xl font-bold mt-1">{agents.filter(a => a.status === "active").length}</p>
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Agent" : "New Supplier Agent"}</DialogTitle>
            <DialogDescription>Fill in the supplier agent details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Agent Name *</label><Input value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Company Name</label><Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={e => handlePhoneChange(e.target.value, (v) => setForm({ ...form, phone: v }))} placeholder="01XXXXXXXXX" maxLength={15} />
              {form.phone.trim() && getPhoneError(form.phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(form.phone)}</p>}
            </div>
            <div><label className="text-sm font-medium">Address</label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Contract Date</label><Input type="date" value={form.contract_date} onChange={e => setForm({ ...form, contract_date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Contracted Pilgrims</label><Input type="number" min="0" value={form.contracted_hajji} onChange={e => setForm({ ...form, contracted_hajji: e.target.value })} placeholder="0" /></div>
              <div><label className="text-sm font-medium">Contracted Amount (BDT)</label><Input type="number" min="0" value={form.contracted_amount} onChange={e => setForm({ ...form, contracted_amount: e.target.value })} placeholder="0" /></div>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Notes</label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete?</DialogTitle>
            <DialogDescription>This supplier agent will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
