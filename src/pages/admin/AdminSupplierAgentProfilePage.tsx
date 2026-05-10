import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { useIsViewer } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, FileText, CreditCard, TrendingDown,
  Phone, MapPin, Truck, Building2, Plus, Wallet, Download, Package, Pencil, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { generateSupplierPdf, getCompanyInfoForPdf, SupplierPdfData } from "@/lib/entityPdfGenerator";
import SupplierContractManager from "@/components/admin/SupplierContractManager";
import SupplierItemsManager from "@/components/admin/SupplierItemsManager";
import { formatBDT, formatTrackingId } from "@/lib/utils";

const PAYMENT_METHODS = ["cash", "bkash", "nagad", "bank", "other"];
const SERVICE_TYPES = [
  { value: "", label: "-- Select Service --" },
  { value: "visa", label: "Visa" },
  { value: "ticket", label: "Ticket" },
  { value: "hajj", label: "Hajj" },
  { value: "umrah", label: "Umrah" },
  { value: "full_package", label: "Full Package" },
  { value: "hotel", label: "Hotel" },
  { value: "transport", label: "Transport" },
  { value: "food", label: "Food" },
  { value: "guide", label: "Guide" },
  { value: "ziyarah", label: "Ziyarah" },
  { value: "insurance", label: "Insurance" },
  { value: "advance", label: "Advance" },
  { value: "refund", label: "Refund" },
  { value: "other", label: "Other" },
];

const normalizeDateForInput = (value: unknown) => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const splitPaymentNotes = (rawNotes: unknown) => {
  const raw = String(rawNotes || "").trim();
  if (!raw) return { service: "", notes: "" };

  const parts = raw.split(/\s+[—-]\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { service: parts[0], notes: parts.slice(1).join(" — ") };
  }

  return { service: "", notes: raw };
};

export default function AdminSupplierAgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isViewer = useIsViewer();
  const [agent, setAgent] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [agentPayments, setAgentPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [contractPayments, setContractPayments] = useState<any[]>([]);
  const [supplierItems, setSupplierItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({ date: "", service: "", amount: "", payment_method: "cash", notes: "" });
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  // Date filter
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const emptyForm = {
    amount: "", payment_method: "cash",
    date: new Date().toISOString().split("T")[0],
    notes: "", wallet_account_id: "", booking_id: "",
    service_type: "",
  };
  const [paymentForm, setPaymentForm] = useState(emptyForm);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const [agRes, bRes, apRes, accRes, cRes, cpRes, itemsRes] = await Promise.all([
      apiClient.from("supplier_agents").select("*").eq("id", id).maybeSingle(),
      apiClient.from("bookings").select("*, packages(name, type, price)").eq("supplier_agent_id", id).order("created_at", { ascending: false }),
      apiClient.from("supplier_agent_payments").select("*").eq("supplier_agent_id", id).order("date", { ascending: false }),
      apiClient.from("accounts").select("id, name, type, balance").order("name"),
      apiClient.from("supplier_contracts").select("*").eq("supplier_id", id).order("created_at", { ascending: false }),
      apiClient.from("supplier_contract_payments").select("*").eq("supplier_id", id).order("payment_date", { ascending: false }),
      apiClient.from("supplier_agent_items").select("*").eq("supplier_agent_id", id).order("created_at", { ascending: true }),
    ]);
    setAgent(agRes.data);
    setBookings((bRes.data as any[]) || []);
    setAgentPayments(apRes.data || []);
    setAccounts(accRes.data || []);
    setContracts(cRes.data || []);
    setContractPayments(cpRes.data || []);
    setSupplierItems(itemsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) { toast({ title: "Please enter a valid amount", variant: "destructive" }); return; }
    setPaymentLoading(true);
    try {
      const { data: { session } } = await apiClient.auth.getSession();
      if (!session) return;
      const serviceLabel = SERVICE_TYPES.find(s => s.value === paymentForm.service_type)?.label || "";
      const combinedNotes = [serviceLabel, paymentForm.notes.trim()].filter(Boolean).join(" — ");
      const { error: apErr } = await apiClient.from("supplier_agent_payments").insert({
        supplier_agent_id: id, amount,
        payment_method: paymentForm.payment_method,
        date: paymentForm.date,
        notes: combinedNotes || null,
        wallet_account_id: paymentForm.wallet_account_id || null,
        booking_id: paymentForm.booking_id || null,
        recorded_by: session.user.id,
      });
      if (apErr) throw apErr;
      const { error: expErr } = await apiClient.from("expenses").insert({
        title: `Supplier Payment — ${agent?.agent_name || ""}`,
        amount, category: "supplier_payment", expense_type: "supplier",
        date: paymentForm.date,
        note: paymentForm.notes.trim() || `Payment to supplier: ${agent?.agent_name}`,
        wallet_account_id: paymentForm.wallet_account_id || null,
      });
      if (expErr) throw expErr;
      toast({ title: "Payment recorded successfully" });
      setShowPaymentForm(false);
      setPaymentForm(emptyForm);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setPaymentLoading(false); }
  };

  const startEditPayment = (p: any) => {
    setEditPaymentId(p.id);
    const parsed = splitPaymentNotes(p.notes);
    setEditPaymentForm({
      date: normalizeDateForInput(p.date),
      service: parsed.service,
      amount: String(p.amount ?? ""),
      payment_method: p.payment_method || "cash",
      notes: parsed.notes,
    });
    setShowEditPaymentModal(true);
  };

  const handleSavePaymentEdit = async () => {
    if (!editPaymentId) return;
    const combinedNotes = [editPaymentForm.service.trim(), editPaymentForm.notes.trim()].filter(Boolean).join(" — ");
    const { error } = await apiClient.from("supplier_agent_payments").update({
      date: editPaymentForm.date || undefined,
      amount: parseFloat(editPaymentForm.amount),
      payment_method: editPaymentForm.payment_method,
      notes: combinedNotes || null,
    }).eq("id", editPaymentId);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Payment updated successfully" });
    setEditPaymentId(null); setShowEditPaymentModal(false); loadData();
  };

  const confirmDeletePayment = async () => {
    if (!deletePaymentId) return;
    const { error } = await apiClient.from("supplier_agent_payments").delete().eq("id", deletePaymentId);
    if (error) { toast({ title: "Failed to delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Payment deleted successfully" });
    setDeletePaymentId(null); loadData();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!agent) return <div className="text-center py-20 text-muted-foreground">Supplier agent not found</div>;

  const itemsTotal = supplierItems.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const totalCost = bookings.reduce((s, b) => s + Number(b.total_cost || 0), 0);
  const totalAgentPaid = agentPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const contractedAmount = Number(agent.contracted_amount || 0);
  // Use items total if items exist, otherwise fall back to contracted_amount
  const totalBilled = itemsTotal > 0 ? itemsTotal : contractedAmount;
  const totalDue = Math.max(0, totalBilled - totalAgentPaid);

  const filterByDate = (items: any[]) => items.filter(p => {
    if (dateFrom && p.date < dateFrom) return false;
    if (dateTo && p.date > dateTo) return false;
    return true;
  });
  const filteredPayments = filterByDate(agentPayments);
  const walletAccounts = accounts.filter(a => ["asset", "wallet"].includes(a.type) || ["Cash", "bKash", "Nagad", "Bank"].includes(a.name));

  const handleDownloadStatement = async () => {
    const company = await getCompanyInfoForPdf();
    const pdfData: SupplierPdfData = {
      agent_name: agent.agent_name, company_name: agent.company_name,
      phone: agent.phone, address: agent.address, status: agent.status, notes: agent.notes,
      items: supplierItems.map((i: any) => ({
        description: i.description, quantity: Number(i.quantity),
        unit_price: Number(i.unit_price), total_amount: Number(i.total_amount),
      })),
      bookings: bookings.map(b => ({
        tracking_id: b.tracking_id, guest_name: b.guest_name || "—",
        package_name: b.packages?.name || "—",
        total: Number(b.total_amount), cost: Number(b.total_cost || 0),
        paid_to_supplier: Number(b.paid_to_supplier || 0),
        supplier_due: Number(b.supplier_due || 0), status: b.status,
      })),
      agentPayments: filteredPayments.map((p: any) => {
        const parsed = splitPaymentNotes(p.notes);
        return {
          amount: Number(p.amount),
          date: p.date,
          method: p.payment_method || "cash",
          notes: parsed.notes,
          category: parsed.service,
        };
      }),
      contracts: contracts.map((c: any) => ({
        contract_amount: Number(c.contract_amount || 0),
        pilgrim_count: Number(c.pilgrim_count || 0),
        total_paid: Number(c.total_paid || 0),
        total_due: Number(c.total_due || 0),
        created_at: c.created_at,
      })),
      contractPayments: contractPayments.map((p: any) => ({
        amount: Number(p.amount), payment_date: p.payment_date,
        payment_method: p.payment_method || "cash", note: p.note,
      })),
      summary: {
        totalBookings: bookings.length,
        totalTravelers: bookings.reduce((s, b) => s + Number(b.num_travelers || 0), 0),
        contractedHajji: Number(agent.contracted_hajji || 0),
        totalPaid: totalAgentPaid,
        totalDue,
        totalBilled,
      },
    };
    await generateSupplierPdf(pdfData, company);
    toast({ title: "PDF downloaded successfully" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate("/admin/supplier-agents")} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />{agent.agent_name}</h1>
          <p className="text-sm text-muted-foreground">Supplier Agent Profile</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleDownloadStatement}><Download className="h-4 w-4 mr-1" /> Full Statement PDF</Button>
          
          <Badge variant={agent.status === "active" ? "default" : "secondary"}>{agent.status === "active" ? "Active" : "Inactive"}</Badge>
        </div>
      </div>

      {/* Info */}
      <Card><CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{agent.company_name || "—"}</div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{agent.phone || "—"}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{agent.address || "—"}</div>
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />Created: {format(new Date(agent.created_at), "dd MMM yyyy")}</div>
        </div>
      </CardContent></Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center">
          <Package className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{formatBDT(totalBilled)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Billed</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <CreditCard className="h-5 w-5 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{formatBDT(totalCost)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Booking Cost</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <Wallet className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-500">{formatBDT(totalAgentPaid)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Paid</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-destructive">{formatBDT(totalDue)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Due</p>
        </CardContent></Card>
      </div>

      {/* Supplier Items / Services */}
      <SupplierItemsManager
        supplierId={id!}
        items={supplierItems}
        isViewer={isViewer}
        onRefresh={loadData}
      />

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Payment History ({filteredPayments.length})</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">From:</span>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-8 text-xs" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">To:</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-8 text-xs" />
              </div>
              {(dateFrom || dateTo) && <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setDateFrom(""); setDateTo(""); }}>Reset</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">Service</th><th className="pb-2 pr-3">Amount</th><th className="pb-2 pr-3">Method</th><th className="pb-2 pr-3">Notes</th>
                  {!isViewer && <th className="pb-2 w-16">Action</th>}
                </tr></thead>
                <tbody>
                  {filteredPayments.map((p: any) => {
                    const parsed = splitPaymentNotes(p.notes);
                    const category = parsed.service || "—";
                    const cleanNotes = parsed.notes || "—";
                    return (
                      <tr key={p.id} className="border-b border-border/30">
                        <td className="py-2 pr-3 text-xs">{format(new Date(p.date), "dd MMM yyyy")}</td>
                        <td className="py-2 pr-3"><Badge variant="outline" className="text-[10px]">{category}</Badge></td>
                        <td className="py-2 pr-3 font-bold text-emerald-500">{formatBDT(p.amount)}</td>
                        <td className="py-2 pr-3 capitalize">{p.payment_method}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{cleanNotes}</td>
                        {!isViewer && (
                          <td className="py-2">
                            <div className="flex gap-1">
                              <button onClick={() => startEditPayment(p)} className="text-primary hover:text-primary/80 p-1"><Pencil className="h-3.5 w-3.5" /></button>
                              <button onClick={() => setDeletePaymentId(p.id)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Contracts */}
      <SupplierContractManager
        supplierId={id!}
        supplierName={agent.agent_name}
        contracts={contracts}
        contractPayments={contractPayments}
        accounts={accounts}
        isViewer={isViewer}
        onRefresh={loadData}
      />

      {/* Bookings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Booking List ({bookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No bookings</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-3">Tracking</th><th className="pb-2 pr-3">Customer</th><th className="pb-2 pr-3">Total Cost</th>
                  <th className="pb-2 pr-3">Paid</th><th className="pb-2 pr-3">Due</th><th className="pb-2">Status</th>
                </tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 font-mono text-primary text-xs">{formatTrackingId(b.tracking_id)}</td>
                      <td className="py-2 pr-3">{b.guest_name || "—"}</td>
                      <td className="py-2 pr-3 font-medium">{formatBDT(b.total_cost)}</td>
                      <td className="py-2 pr-3 text-emerald-500">{formatBDT(b.paid_to_supplier)}</td>
                      <td className="py-2 pr-3 text-destructive">{formatBDT(b.supplier_due)}</td>
                      <td className="py-2"><Badge variant={b.status === "completed" ? "default" : "secondary"} className="text-[10px] capitalize">{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Supplier Payment</DialogTitle><DialogDescription>Enter payment details</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Service Type</label>
              <Select value={paymentForm.service_type || ""} onValueChange={(v) => setPaymentForm({ ...paymentForm, service_type: v })}>
                <SelectTrigger><SelectValue placeholder="-- Select Service --" /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.filter(s => s.value).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Amount (BDT) *</label>
              <Input type="number" min={0} value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Method</label>
              <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Date</label>
              <Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Booking (Optional)</label>
              <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm" value={paymentForm.booking_id} onChange={(e) => setPaymentForm({ ...paymentForm, booking_id: e.target.value })}>
                <option value="">-- All Bookings --</option>
                {bookings.map(b => <option key={b.id} value={b.id}>{formatTrackingId(b.tracking_id)} — Due: {formatBDT(b.supplier_due)}</option>)}
              </select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} placeholder="Notes..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={paymentLoading}>{paymentLoading ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Modal */}
      <Dialog open={showEditPaymentModal} onOpenChange={(o) => { if (!o) { setShowEditPaymentModal(false); setEditPaymentId(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Supplier Payment</DialogTitle><DialogDescription>Modify payment details</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Date</label>
              <Input type="date" value={editPaymentForm.date} onChange={(e) => setEditPaymentForm({ ...editPaymentForm, date: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Service</label>
              <Input value={editPaymentForm.service} onChange={(e) => setEditPaymentForm({ ...editPaymentForm, service: e.target.value })} placeholder="Service name" /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Amount (BDT) *</label>
              <Input type="number" min={0} value={editPaymentForm.amount} onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Method</label>
              <Select value={editPaymentForm.payment_method} onValueChange={(v) => setEditPaymentForm({ ...editPaymentForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <Input value={editPaymentForm.notes} onChange={(e) => setEditPaymentForm({ ...editPaymentForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditPaymentModal(false); setEditPaymentId(null); }}>Cancel</Button>
            <Button onClick={handleSavePaymentEdit}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Confirmation */}
      {deletePaymentId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeletePaymentId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-2">Delete Payment?</h3>
            <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeletePaymentId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeletePayment}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
