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
  ArrowLeft, Users, FileText, CreditCard, TrendingDown,
  Phone, MapPin, CalendarDays, Hash, Plus, Wallet, Download,
  Package, Trash2, Pencil, Save, X,
} from "lucide-react";
import { format } from "date-fns";
import { generateMoallemPdf, getCompanyInfoForPdf, MoallemPdfData } from "@/lib/entityPdfGenerator";
import { formatBDT } from "@/lib/utils";

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

export default function AdminMoallemProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isViewer = useIsViewer();
  const [moallem, setMoallem] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [moallemPayments, setMoallemPayments] = useState<any[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [moallemItems, setMoallemItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfBookingFilter, setPdfBookingFilter] = useState<"due" | "all">("due");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [itemForm, setItemForm] = useState({ description: "", quantity: "1", unit_price: "0" });
  const [editItemId, setEditItemId] = useState<string | null>(null);

  // Edit/Delete payment state
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [editPaymentType, setEditPaymentType] = useState<"payment" | "commission">("payment");
  const [editPaymentForm, setEditPaymentForm] = useState({ amount: "", payment_method: "cash", date: "", notes: "", service_type: "", booking_id: "", wallet_account_id: "" });
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deletePaymentType, setDeletePaymentType] = useState<"payment" | "commission">("payment");

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
  const [commissionForm, setCommissionForm] = useState(emptyForm);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    const [mRes, bRes, mpRes, cpRes, accRes, itemsRes] = await Promise.all([
      apiClient.from("moallems").select("*").eq("id", id).maybeSingle(),
      apiClient.from("bookings").select("*, packages(name, type, price)").eq("moallem_id", id).order("created_at", { ascending: false }),
      apiClient.from("moallem_payments").select("*").eq("moallem_id", id).order("date", { ascending: false }),
      (apiClient as any).from("moallem_commission_payments").select("*").eq("moallem_id", id).order("date", { ascending: false }),
      apiClient.from("accounts").select("id, name, type, balance").order("name"),
      (apiClient as any).from("moallem_items").select("*").eq("moallem_id", id).order("created_at", { ascending: false }),
    ]);
    setMoallem(mRes.data);
    setBookings(bRes.data || []);
    setMoallemPayments(mpRes.data || []);
    setCommissionPayments(cpRes.data || []);
    setAccounts(accRes.data || []);
    setMoallemItems(itemsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  // Service Items CRUD
  const handleAddItem = async () => {
    const qty = parseFloat(itemForm.quantity) || 0;
    const price = parseFloat(itemForm.unit_price) || 0;
    if (!itemForm.description.trim()) { toast({ title: "Please enter a description", variant: "destructive" }); return; }
    if (qty <= 0 || price <= 0) { toast({ title: "Please enter valid quantity and price", variant: "destructive" }); return; }
    const { error } = await (apiClient as any).from("moallem_items").insert({
      moallem_id: id,
      description: itemForm.description.trim(),
      quantity: qty,
      unit_price: price,
      total_amount: qty * price,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Item added successfully" });
    setItemForm({ description: "", quantity: "1", unit_price: "0" });
    setShowItemForm(false);
    loadData();
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await (apiClient as any).from("moallem_items").delete().eq("id", itemId);
    if (error) { toast({ title: "Failed to delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Item deleted successfully" });
    loadData();
  };

  const startEditItem = (item: any) => {
    setEditItemId(item.id);
    setItemForm({ description: item.description, quantity: String(item.quantity), unit_price: String(item.unit_price) });
    setShowItemForm(true);
  };

  const handleSaveItem = async () => {
    const qty = parseFloat(itemForm.quantity) || 0;
    const price = parseFloat(itemForm.unit_price) || 0;
    if (!itemForm.description.trim()) { toast({ title: "Please enter a description", variant: "destructive" }); return; }
    if (qty <= 0 || price <= 0) { toast({ title: "Please enter valid quantity and price", variant: "destructive" }); return; }
    if (editItemId) {
      const { error } = await (apiClient as any).from("moallem_items").update({
        description: itemForm.description.trim(), quantity: qty, unit_price: price, total_amount: qty * price,
      }).eq("id", editItemId);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Item updated successfully" });
    } else {
      const { error } = await (apiClient as any).from("moallem_items").insert({
        moallem_id: id, description: itemForm.description.trim(), quantity: qty, unit_price: price, total_amount: qty * price,
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Item added successfully" });
    }
    setItemForm({ description: "", quantity: "1", unit_price: "0" });
    setEditItemId(null);
    setShowItemForm(false);
    loadData();
  };

  // Payment edit/delete handlers
  const startEditPayment = (p: any, type: "payment" | "commission") => {
    setEditPaymentId(p.id);
    setEditPaymentType(type);
    // Extract service from notes
    const noteParts = (p.notes || "").split(" — ");
    const foundService = SERVICE_TYPES.find(s => s.label === noteParts[0]);
    const serviceType = foundService ? foundService.value : "";
    const restNotes = foundService ? noteParts.slice(1).join(" — ") : (p.notes || "");
    setEditPaymentForm({
      amount: String(p.amount), payment_method: p.payment_method || "cash",
      date: p.date || "", notes: restNotes,
      service_type: serviceType, booking_id: p.booking_id || "",
      wallet_account_id: p.wallet_account_id || "",
    });
    setShowEditPaymentModal(true);
  };

  const handleSavePaymentEdit = async () => {
    if (!editPaymentId) return;
    const table = editPaymentType === "commission" ? "moallem_commission_payments" : "moallem_payments";
    const serviceLabel = SERVICE_TYPES.find(s => s.value === editPaymentForm.service_type)?.label || "";
    const combinedNotes = [serviceLabel, editPaymentForm.notes.trim()].filter(Boolean).join(" — ");
    const { error } = await (apiClient as any).from(table).update({
      amount: parseFloat(editPaymentForm.amount), payment_method: editPaymentForm.payment_method,
      date: editPaymentForm.date || undefined, notes: combinedNotes || null,
      booking_id: editPaymentForm.booking_id || null,
      wallet_account_id: editPaymentForm.wallet_account_id || null,
    }).eq("id", editPaymentId);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Payment updated successfully" });
    setEditPaymentId(null); setShowEditPaymentModal(false); loadData();
  };

  const confirmDeletePayment = async () => {
    if (!deletePaymentId) return;
    const table = deletePaymentType === "commission" ? "moallem_commission_payments" : "moallem_payments";
    const { error } = await (apiClient as any).from(table).delete().eq("id", deletePaymentId);
    if (error) { toast({ title: "Failed to delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Payment deleted successfully" });
    setDeletePaymentId(null); loadData();
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) { toast({ title: "Please enter a valid amount", variant: "destructive" }); return; }
    setPaymentLoading(true);
    try {
      const { data: { session } } = await apiClient.auth.getSession();
      if (!session) return;
      const serviceLabel = SERVICE_TYPES.find(s => s.value === paymentForm.service_type)?.label || "";
      const combinedNotes = [serviceLabel, paymentForm.notes.trim()].filter(Boolean).join(" — ");
      const { error } = await apiClient.from("moallem_payments").insert({
        moallem_id: id, amount,
        payment_method: paymentForm.payment_method,
        date: paymentForm.date,
        notes: combinedNotes || null,
        wallet_account_id: paymentForm.wallet_account_id || null,
        booking_id: paymentForm.booking_id || null,
        recorded_by: session.user.id,
      });
      if (error) throw error;

      // FIFO distribute to unpaid bookings
      let remaining = amount;
      const unpaid = bookings.filter(b => Number(b.due_amount || 0) > 0).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (const booking of unpaid) {
        if (remaining <= 0) break;
        const due = Number(booking.due_amount || 0);
        const allocate = Math.min(remaining, due);
        await apiClient.from("payments").insert({
          booking_id: booking.id,
          user_id: booking.user_id || session.user.id,
          customer_id: booking.user_id,
          amount: allocate, status: "completed",
          payment_method: paymentForm.payment_method,
          paid_at: new Date().toISOString(),
          notes: `Moallem Deposit — ${moallem?.name || ""}`,
          wallet_account_id: paymentForm.wallet_account_id || null,
        });
        remaining -= allocate;
      }

      toast({ title: "Payment recorded successfully" });
      setShowPaymentForm(false);
      setPaymentForm(emptyForm);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setPaymentLoading(false); }
  };

  const handleRecordCommission = async () => {
    const amount = parseFloat(commissionForm.amount);
    if (!amount || amount <= 0) { toast({ title: "Please enter a valid amount", variant: "destructive" }); return; }
    setPaymentLoading(true);
    try {
      const { data: { session } } = await apiClient.auth.getSession();
      if (!session) return;
      const serviceLabel = SERVICE_TYPES.find(s => s.value === commissionForm.service_type)?.label || "";
      const combinedNotes = [serviceLabel, commissionForm.notes.trim()].filter(Boolean).join(" — ");
      const { error } = await (apiClient as any).from("moallem_commission_payments").insert({
        moallem_id: id, amount,
        payment_method: commissionForm.payment_method,
        date: commissionForm.date,
        notes: combinedNotes || null,
        wallet_account_id: commissionForm.wallet_account_id || null,
        booking_id: commissionForm.booking_id || null,
        recorded_by: session.user.id,
      });
      if (error) throw error;
      toast({ title: "Commission payment recorded successfully" });
      setShowCommissionForm(false);
      setCommissionForm(emptyForm);
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setPaymentLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!moallem) return <div className="text-center py-20 text-muted-foreground">Moallem not found</div>;

  const totalSelling = Number(moallem.contracted_amount || 0);
  const totalItemsBilled = moallemItems.reduce((s: number, item: any) => s + Number(item.total_amount || 0), 0);
  const effectiveTotal = totalItemsBilled > 0 ? totalItemsBilled : totalSelling;
  const totalPaid = moallemPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalMoallemDue = Math.max(0, effectiveTotal - totalPaid);

  // Filter payments by date
  const filterByDate = (items: any[]) => {
    return items.filter(p => {
      if (dateFrom && p.date < dateFrom) return false;
      if (dateTo && p.date > dateTo) return false;
      return true;
    });
  };
  const filteredPayments = filterByDate(moallemPayments);
  const filteredCommissions = filterByDate(commissionPayments);
  const walletAccounts = accounts.filter(a => ["asset", "wallet"].includes(a.type) || ["Cash", "bKash", "Nagad", "Bank"].includes(a.name));

  const handleDownloadStatement = async () => {
    const company = await getCompanyInfoForPdf();
    const pdfData: MoallemPdfData = {
      name: moallem.name, phone: moallem.phone, address: moallem.address,
      nid_number: moallem.nid_number, contract_date: moallem.contract_date,
      status: moallem.status, notes: moallem.notes,
      bookings: (pdfBookingFilter === "due" ? bookings.filter(b => Number(b.due_amount || 0) > 0) : bookings)
        .map(b => ({
          tracking_id: b.tracking_id, guest_name: b.guest_name || "—",
          package_name: b.packages?.name || "—",
          total: Number(b.total_amount), paid: Number(b.paid_amount),
          due: Number(b.due_amount || 0), status: b.status,
          date: format(new Date(b.created_at), "dd MMM yyyy"),
        })),
      moallemPayments: filteredPayments.map(p => ({ amount: Number(p.amount), date: p.date, method: p.payment_method || "cash", notes: p.notes })),
      commissionPayments: filteredCommissions.map(p => ({ amount: Number(p.amount), date: p.date, method: p.payment_method || "cash", notes: p.notes })),
      summary: {
        totalBookings: bookings.length, totalTravelers: bookings.reduce((s, b) => s + Number(b.num_travelers || 0), 0),
        totalAmount: totalSelling, totalPaid, totalDue: totalMoallemDue,
        totalDeposit: totalPaid,
        totalCommission: bookings.reduce((s, b) => s + Number(b.total_commission || 0), 0),
        commissionPaid: bookings.reduce((s, b) => s + Number(b.commission_paid || 0), 0),
        commissionDue: bookings.reduce((s, b) => s + Number(b.commission_due || 0), 0),
      },
    };
    await generateMoallemPdf(pdfData, company);
    toast({ title: "PDF downloaded successfully" });
  };

  const renderPaymentDialog = (title: string, show: boolean, setShow: (v: boolean) => void, formState: any, setFormState: (v: any) => void, onSubmit: () => void) => (
    <Dialog open={show} onOpenChange={setShow}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Enter payment details</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground block mb-1">Service Type</label>
            <Select value={formState.service_type || ""} onValueChange={(v) => setFormState({ ...formState, service_type: v })}>
              <SelectTrigger><SelectValue placeholder="-- Select Service --" /></SelectTrigger>
              <SelectContent>{SERVICE_TYPES.filter(s => s.value).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Amount (BDT) *</label>
            <Input type="number" min={0} value={formState.amount} onChange={(e) => setFormState({ ...formState, amount: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Method</label>
            <Select value={formState.payment_method} onValueChange={(v) => setFormState({ ...formState, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Date</label>
            <Input type="date" value={formState.date} onChange={(e) => setFormState({ ...formState, date: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Booking (Optional)</label>
            <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm" value={formState.booking_id} onChange={(e) => setFormState({ ...formState, booking_id: e.target.value })}>
              <option value="">-- All Bookings --</option>
              {bookings.map(b => <option key={b.id} value={b.id}>{b.tracking_id} — {b.guest_name || "—"}</option>)}
            </select></div>
          <div><label className="text-xs text-muted-foreground block mb-1">Notes</label>
            <Input value={formState.notes} onChange={(e) => setFormState({ ...formState, notes: e.target.value })} placeholder="Notes..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShow(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={paymentLoading}>{paymentLoading ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate("/admin/moallems")} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">{moallem.name}</h1>
          <p className="text-sm text-muted-foreground">Moallem Profile</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Select value={pdfBookingFilter} onValueChange={(v: "due" | "all") => setPdfBookingFilter(v)}>
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="due">Only Due</SelectItem>
                <SelectItem value="all">All Bookings</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleDownloadStatement}><Download className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
          {!isViewer && (
              <Button variant="outline" size="sm" onClick={() => setShowCommissionForm(true)}><Plus className="h-4 w-4 mr-1" /> Commission</Button>
          )}
          <Badge variant={moallem.status === "active" ? "default" : "secondary"}>{moallem.status === "active" ? "Active" : "Inactive"}</Badge>
        </div>
      </div>

      {/* Info */}
      <Card><CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{moallem.phone || "—"}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{moallem.address || "—"}</div>
          <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" />NID: {moallem.nid_number || "—"}</div>
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" />Contract: {moallem.contract_date || "—"}</div>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Contracted Pilgrims: {moallem.contracted_hajji || 0}</div>
          <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" />Contracted Amount: {formatBDT(moallem.contracted_amount || 0)}</div>
        </div>
      </CardContent></Card>

      {/* KPIs - 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center">
          <CreditCard className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{formatBDT(totalSelling)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Contracted Amount</p>
        </CardContent></Card>
        {totalItemsBilled > 0 && (
          <Card><CardContent className="pt-4 pb-4 text-center">
            <Package className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">{formatBDT(totalItemsBilled)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Service Items Total</p>
          </CardContent></Card>
        )}
        <Card><CardContent className="pt-4 pb-4 text-center">
          <Wallet className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-500">{formatBDT(totalPaid)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Paid</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-destructive">{formatBDT(totalMoallemDue)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Due</p>
        </CardContent></Card>
      </div>

      {/* Consolidated Financial Summary */}
      <Card className="border-primary/20 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Service Items Summary */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Items</h4>
              {moallemItems.length > 0 ? (
                <div className="space-y-1.5">
                  {moallemItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.description} ({Number(item.quantity)} x {formatBDT(Number(item.unit_price))})</span>
                      <span className="font-medium">{formatBDT(Number(item.total_amount))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                    <span>Total Services</span>
                    <span>{formatBDT(totalItemsBilled)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No items — Contracted Amount: {formatBDT(totalSelling)}</p>
              )}
            </div>

            {/* Right: Payment Breakdown by Method */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Breakdown</h4>
              {moallemPayments.length > 0 ? (() => {
                const byMethod: Record<string, number> = {};
                moallemPayments.forEach((p: any) => {
                  const key = (p.notes && p.notes.trim()) ? p.notes.trim() : (p.payment_method || "cash");
                  byMethod[key] = (byMethod[key] || 0) + Number(p.amount || 0);
                });
                return (
                  <div className="space-y-1.5">
                    {Object.entries(byMethod).map(([method, amount]) => (
                      <div key={method} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{method}</span>
                        <span className="font-medium text-emerald-500">{formatBDT(amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                      <span>Total Paid</span>
                      <span className="text-emerald-500">{formatBDT(totalPaid)}</span>
                    </div>
                  </div>
                );
              })() : (
                <p className="text-sm text-muted-foreground">No payments yet</p>
              )}
            </div>
          </div>

          {/* Bottom Summary Bar */}
          <div className="mt-5 pt-4 border-t-2 border-primary/20 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Amount</p>
              <p className="text-lg font-bold">{formatBDT(effectiveTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Payment</p>
              <p className="text-lg font-bold text-emerald-500">{formatBDT(totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Due Amount</p>
              <p className="text-lg font-bold text-destructive">{formatBDT(totalMoallemDue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Service Items ({moallemItems.length})</CardTitle>
            {!isViewer && (
              <Button size="sm" variant="outline" onClick={() => setShowItemForm(true)}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {moallemItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No service items</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-3">Description</th><th className="pb-2 pr-3 text-right">Quantity</th><th className="pb-2 pr-3 text-right">Unit Price</th><th className="pb-2 pr-3 text-right">Total</th>
                  {!isViewer && <th className="pb-2 w-10"></th>}
                </tr></thead>
                <tbody>
                  {moallemItems.map((item: any) => (
                    <tr key={item.id} className="border-b border-border/30">
                      <td className="py-2 pr-3">{item.description}</td>
                      <td className="py-2 pr-3 text-right">{Number(item.quantity)}</td>
                      <td className="py-2 pr-3 text-right">{formatBDT(Number(item.unit_price))}</td>
                      <td className="py-2 pr-3 text-right font-bold">{formatBDT(Number(item.total_amount))}</td>
                      {!isViewer && (
                        <td className="py-2">
                          <div className="flex gap-1">
                            <button onClick={() => startEditItem(item)} className="text-primary hover:text-primary/80 p-1"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDeleteItem(item.id)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={3} className="py-2 pr-3 text-right font-semibold text-xs text-muted-foreground uppercase">Total</td>
                    <td className="py-2 pr-3 text-right font-bold text-foreground">{formatBDT(totalItemsBilled)}</td>
                    {!isViewer && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" placeholder="From" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" placeholder="To" />
        {(dateFrom || dateTo) && <Button variant="outline" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Reset</Button>}
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Payment History ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">Amount</th><th className="pb-2 pr-3">Method</th><th className="pb-2 pr-3">Service</th><th className="pb-2 pr-3">Booking</th><th className="pb-2 pr-3">Notes</th>
                  {!isViewer && <th className="pb-2 w-16">Action</th>}
                </tr></thead>
                <tbody>
                  {filteredPayments.map((p: any) => {
                    const noteParts = (p.notes || "").split(" — ");
                    const serviceLabel = SERVICE_TYPES.find(s => s.label === noteParts[0])?.label || "";
                    const restNotes = serviceLabel ? noteParts.slice(1).join(" — ") : (p.notes || "");
                    return (
                    <tr key={p.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 text-xs">{format(new Date(p.date), "dd MMM yyyy")}</td>
                      <td className="py-2 pr-3 font-bold text-emerald-500">{formatBDT(p.amount)}</td>
                      <td className="py-2 pr-3 capitalize">{p.payment_method}</td>
                      <td className="py-2 pr-3 text-xs"><Badge variant="outline" className="text-[10px]">{serviceLabel || "—"}</Badge></td>
                      <td className="py-2 pr-3 text-xs font-mono text-primary">{p.booking_id ? bookings.find(b => b.id === p.booking_id)?.tracking_id || "—" : "—"}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{restNotes || "—"}</td>
                      {!isViewer && (
                        <td className="py-2">
                          <div className="flex gap-1">
                            <button onClick={() => startEditPayment(p, "payment")} className="text-primary hover:text-primary/80 p-1"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => { setDeletePaymentId(p.id); setDeletePaymentType("payment"); }} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                      </td>
                      )}
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Payments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Commission Payments ({filteredCommissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCommissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No commission payments</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-3">Date</th><th className="pb-2 pr-3">Amount</th><th className="pb-2 pr-3">Method</th><th className="pb-2 pr-3">Service</th><th className="pb-2 pr-3">Booking</th><th className="pb-2 pr-3">Notes</th>
                  {!isViewer && <th className="pb-2 w-16">Action</th>}
                </tr></thead>
                <tbody>
                  {filteredCommissions.map((p: any) => {
                    const noteParts = (p.notes || "").split(" — ");
                    const serviceLabel = SERVICE_TYPES.find(s => s.label === noteParts[0])?.label || "";
                    const restNotes = serviceLabel ? noteParts.slice(1).join(" — ") : (p.notes || "");
                    return (
                    <tr key={p.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 text-xs">{format(new Date(p.date), "dd MMM yyyy")}</td>
                      <td className="py-2 pr-3 font-bold text-emerald-500">{formatBDT(p.amount)}</td>
                      <td className="py-2 pr-3 capitalize">{p.payment_method}</td>
                      <td className="py-2 pr-3 text-xs"><Badge variant="outline" className="text-[10px]">{serviceLabel || "—"}</Badge></td>
                      <td className="py-2 pr-3 text-xs font-mono text-primary">{p.booking_id ? bookings.find(b => b.id === p.booking_id)?.tracking_id || "—" : "—"}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{restNotes || "—"}</td>
                      {!isViewer && (
                        <td className="py-2">
                          <div className="flex gap-1">
                            <button onClick={() => startEditPayment(p, "commission")} className="text-primary hover:text-primary/80 p-1"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => { setDeletePaymentId(p.id); setDeletePaymentType("commission"); }} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                      </td>
                      )}
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                  <th className="pb-2 pr-3">Tracking</th><th className="pb-2 pr-3">Customer</th><th className="pb-2 pr-3">Package</th>
                  <th className="pb-2 pr-3">Total</th><th className="pb-2 pr-3">Paid</th><th className="pb-2 pr-3">Due</th><th className="pb-2">Status</th>
                </tr></thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 font-mono text-primary text-xs">{b.tracking_id}</td>
                      <td className="py-2 pr-3">{b.guest_name || "—"}</td>
                      <td className="py-2 pr-3">{b.packages?.name || "—"}</td>
                      <td className="py-2 pr-3 font-medium">{formatBDT(b.total_amount)}</td>
                      <td className="py-2 pr-3 text-emerald-500">{formatBDT(b.paid_amount)}</td>
                      <td className="py-2 pr-3 text-destructive">{formatBDT(b.due_amount)}</td>
                      <td className="py-2"><Badge variant={b.status === "completed" ? "default" : "secondary"} className="text-[10px] capitalize">{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {renderPaymentDialog("Record Moallem Payment", showPaymentForm, setShowPaymentForm, paymentForm, setPaymentForm, handleRecordPayment)}
      {renderPaymentDialog("Record Commission Payment", showCommissionForm, setShowCommissionForm, commissionForm, setCommissionForm, handleRecordCommission)}

      {/* Add/Edit Service Item Dialog */}
      <Dialog open={showItemForm} onOpenChange={(o) => { if (!o) { setShowItemForm(false); setEditItemId(null); setItemForm({ description: "", quantity: "1", unit_price: "0" }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItemId ? "Edit Service Item" : "Add Service Item"}</DialogTitle><DialogDescription>Enter the service details provided by the moallem</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Description *</label>
              <Input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="e.g. Umrah Visa, Ticket..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground block mb-1">Quantity</label>
                <Input type="number" min={1} value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Unit Price (BDT)</label>
                <Input type="number" min={0} value={itemForm.unit_price} onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })} /></div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-bold">{formatBDT((parseFloat(itemForm.quantity) || 0) * (parseFloat(itemForm.unit_price) || 0))}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowItemForm(false); setEditItemId(null); setItemForm({ description: "", quantity: "1", unit_price: "0" }); }}>Cancel</Button>
            <Button onClick={handleSaveItem}>{editItemId ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Modal */}
      <Dialog open={showEditPaymentModal} onOpenChange={(o) => { if (!o) { setShowEditPaymentModal(false); setEditPaymentId(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editPaymentType === "commission" ? "Edit Commission Payment" : "Edit Payment"}</DialogTitle><DialogDescription>Modify payment details</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground block mb-1">Date</label>
              <Input type="date" value={editPaymentForm.date} onChange={(e) => setEditPaymentForm({ ...editPaymentForm, date: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Amount (BDT) *</label>
              <Input type="number" min={0} value={editPaymentForm.amount} onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Method</label>
              <Select value={editPaymentForm.payment_method} onValueChange={(v) => setEditPaymentForm({ ...editPaymentForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Service Type</label>
              <Select value={editPaymentForm.service_type || ""} onValueChange={(v) => setEditPaymentForm({ ...editPaymentForm, service_type: v })}>
                <SelectTrigger><SelectValue placeholder="-- Select Service --" /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.filter(s => s.value).map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className="text-xs text-muted-foreground block mb-1">Booking (Optional)</label>
              <select className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm" value={editPaymentForm.booking_id} onChange={(e) => setEditPaymentForm({ ...editPaymentForm, booking_id: e.target.value })}>
                <option value="">-- No Booking --</option>
                {bookings.map(b => <option key={b.id} value={b.id}>{b.tracking_id} — {b.guest_name || "—"}</option>)}
              </select></div>
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
