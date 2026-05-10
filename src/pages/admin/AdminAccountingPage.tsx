import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, X, Edit2, Trash2, Save, Filter, TrendingUp, TrendingDown, BarChart3, Search, FileDown, FileSpreadsheet } from "lucide-react";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { useIsViewer, useCanModifyFinancials } from "@/components/admin/AdminLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DailyCashbook from "@/components/admin/DailyCashbook";
import { formatBDT, formatTrackingId } from "@/lib/utils";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const EXPENSE_TYPES = [
  { value: "visa", label: "Visa Cost" },
  { value: "ticket", label: "Ticket Cost" },
  { value: "hotel", label: "Hotel Cost" },
  { value: "transport", label: "Transport Cost" },
  { value: "food", label: "Food Cost" },
  { value: "guide", label: "Guide Cost" },
  { value: "office", label: "Office Cost" },
  { value: "marketing", label: "Marketing Cost" },
  { value: "salary", label: "Salary" },
  { value: "other", label: "Other" },
];

const ASSIGN_TO = [
  { value: "booking", label: "Booking" },
  { value: "customer", label: "Customer" },
  { value: "package", label: "Package" },
  { value: "general", label: "General Office" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank", label: "Bank Transfer" },
  { value: "manual", label: "Manual" },
];

const EMPTY_FORM = {
  title: "", amount: "", expense_type: "visa", category: "general",
  note: "", date: new Date().toISOString().split("T")[0],
  booking_id: "", customer_id: "", package_id: "",
  wallet_account_id: "", payment_method: "cash",
};

const TABS = [
  { key: "cashbook", label: "Daily Cashbook" },
  { key: "expenses", label: "Expenses" },
  { key: "booking", label: "Booking Profit" },
  { key: "package", label: "Package Profit" },
  { key: "customer", label: "Customer Profit" },
];

const normalizeDate = (d: string) => (d ? d.substring(0, 10) : "");

export default function AdminAccountingPage() {
  const isViewer = useIsViewer();
  const canModify = useCanModifyFinancials();
  const [tab, setTab] = useState("cashbook");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "add";
  });
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewExpense, setViewExpense] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [walletAccounts, setWalletAccounts] = useState<any[]>([]);
  const [dailyCashbookEntries, setDailyCashbookEntries] = useState<any[]>([]);
  const [customerRevenue, setCustomerRevenue] = useState(0);
  const [moallemRevenue, setMoallemRevenue] = useState(0);
  const [supplierExpenseTotal, setSupplierExpenseTotal] = useState(0);
  const [supplierContractExpenseTotal, setSupplierContractExpenseTotal] = useState(0);
  const [commissionExpenseTotal, setCommissionExpenseTotal] = useState(0);
  const [filterType, setFilterType] = useState("all");
  const [filterAssign, setFilterAssign] = useState("all");

  // Profit views
  const [bookingProfit, setBookingProfit] = useState<any[]>([]);
  const [packageProfit, setPackageProfit] = useState<any[]>([]);
  const [customerProfit, setCustomerProfit] = useState<any[]>([]);

  const fetchData = async () => {
    const [expRes, payRes, bkRes, custRes, pkgRes, walletRes, cashbookRes, moallemPayRes, supplierPayRes, supplierContractPayRes, commissionPayRes] = await Promise.all([
      apiClient.from("expenses").select("*").order("date", { ascending: false }),
      apiClient.from("payments").select("amount").eq("status", "completed"),
      apiClient.from("bookings").select("id, tracking_id, guest_name, user_id").order("created_at", { ascending: false }),
      apiClient.from("profiles").select("id, user_id, full_name, phone").order("full_name"),
      apiClient.from("packages").select("id, name, type").eq("is_active", true).order("name"),
      apiClient.from("accounts" as any).select("*").eq("type", "asset"),
      apiClient.from("daily_cashbook" as any).select("date, type, amount, category, payment_method").order("date", { ascending: false }),
      apiClient.from("moallem_payments").select("amount"),
      apiClient.from("supplier_agent_payments").select("amount"),
      apiClient.from("supplier_contract_payments").select("amount"),
      apiClient.from("moallem_commission_payments").select("amount"),
    ]);
    setExpenses(expRes.data || []);
    setCustomerRevenue((payRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0));
    setMoallemRevenue((moallemPayRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0));
    setSupplierExpenseTotal((supplierPayRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0));
    setSupplierContractExpenseTotal((supplierContractPayRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0));
    setCommissionExpenseTotal((commissionPayRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0));
    setBookings(bkRes.data || []);
    setCustomers(custRes.data || []);
    setPackages(pkgRes.data || []);
    setWalletAccounts((walletRes.data as any[]) || []);
    setDailyCashbookEntries((cashbookRes.data as any[]) || []);
  };

  const fetchProfitViews = async () => {
    const [bpRes, ppRes, cpRes] = await Promise.all([
      apiClient.from("v_booking_profit" as any).select("*"),
      apiClient.from("v_package_profit" as any).select("*"),
      apiClient.from("v_customer_profit" as any).select("*"),
    ]);
    setBookingProfit((bpRes.data as any[]) || []);
    setPackageProfit((ppRes.data as any[]) || []);
    setCustomerProfit((cpRes.data as any[]) || []);
  };

  useEffect(() => { fetchData(); fetchProfitViews(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    const payload: any = {
      title: form.title.trim(), amount: parseFloat(form.amount), expense_type: form.expense_type,
      category: form.category, note: form.note.trim() || null, date: form.date || undefined,
      booking_id: form.category === "booking" && form.booking_id ? form.booking_id : null,
      customer_id: form.category === "customer" && form.customer_id ? form.customer_id : null,
      package_id: form.category === "package" && form.package_id ? form.package_id : null,
      wallet_account_id: form.wallet_account_id || null,
    };
    const { error } = await apiClient.from("expenses").insert(payload);
    if (error) {
      if (error.message?.includes("Insufficient wallet balance")) toast.error("Insufficient wallet balance");
      else toast.error(error.message);
      return;
    }
    toast.success("Expense recorded successfully");
    setShowForm(false); setForm({ ...EMPTY_FORM });
    fetchData(); fetchProfitViews();
  };

  const startEdit = (e: any) => {
    setEditingId(e.id);
    setEditForm({ title: e.title, amount: e.amount, expense_type: e.expense_type || "other", category: e.category || "general", note: e.note || "", date: e.date, booking_id: e.booking_id || "", customer_id: e.customer_id || "", package_id: e.package_id || "", wallet_account_id: e.wallet_account_id || "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const payload: any = {
      title: editForm.title, amount: parseFloat(editForm.amount), expense_type: editForm.expense_type,
      category: editForm.category, note: editForm.note || null, date: editForm.date,
      booking_id: editForm.category === "booking" && editForm.booking_id ? editForm.booking_id : null,
      customer_id: editForm.category === "customer" && editForm.customer_id ? editForm.customer_id : null,
      package_id: editForm.category === "package" && editForm.package_id ? editForm.package_id : null,
      wallet_account_id: editForm.wallet_account_id || null,
    };
    const { error } = await apiClient.from("expenses").update(payload).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Expense updated"); setEditingId(null);
    fetchData(); fetchProfitViews();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await apiClient.from("expenses").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Expense deleted"); setDeleteId(null);
    fetchData(); fetchProfitViews();
  };

  const totalExpenseAmount = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const cashbookTotalIncome = dailyCashbookEntries.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + Number(e.amount), 0);
  const cashbookTotalExpense = dailyCashbookEntries.filter((e: any) => e.type === "expense").reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalIncome = customerRevenue + moallemRevenue + cashbookTotalIncome;
  const totalExpenses = totalExpenseAmount + supplierExpenseTotal + supplierContractExpenseTotal + commissionExpenseTotal + cashbookTotalExpense;
  const netProfit = totalIncome - totalExpenses;

  const today = new Date().toISOString().split("T")[0];

  const dailyIncome = useMemo(
    () =>
      dailyCashbookEntries
        .filter((e: any) => normalizeDate(e.date) === today && e.type === "income")
        .reduce((s: number, e: any) => s + Number(e.amount), 0),
    [dailyCashbookEntries, today]
  );

  const dailyExpense = useMemo(
    () =>
      dailyCashbookEntries
        .filter((e: any) => normalizeDate(e.date) === today && e.type === "expense")
        .reduce((s: number, e: any) => s + Number(e.amount), 0),
    [dailyCashbookEntries, today]
  );

  const filtered = useMemo(() => {
    return expenses.filter((e: any) => {
      if (filterType !== "all" && e.expense_type !== filterType) return false;
      if (filterAssign !== "all" && e.category !== filterAssign) return false;
      return true;
    });
  }, [expenses, filterType, filterAssign]);

  const typeTotals = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e: any) => { const t = e.expense_type || "other"; map[t] = (map[t] || 0) + Number(e.amount); });
    return map;
  }, [expenses]);

  const todayCashbookRows = useMemo(
    () =>
      dailyCashbookEntries
        .filter((e: any) => normalizeDate(e.date) === today)
        .map((e: any) => [
          e.type === "income" ? "Income" : "Expense",
          e.category || "—",
          e.payment_method || "—",
          Number(e.amount || 0),
          normalizeDate(e.date),
        ]),
    [dailyCashbookEntries, today]
  );

  const handleTopExportPDF = async () => {
    try {
      if (tab === "cashbook") {
        if (!todayCashbookRows.length) {
          toast.error("No cashbook data for today");
          return;
        }
        await exportPDF({
          title: `Daily Cashbook ${today}`,
          columns: ["Type", "Category", "Method", "Amount", "Date"],
          rows: todayCashbookRows,
          summary: [
            `Total Income: BDT ${dailyIncome.toLocaleString("en-IN")}`,
            `Total Expense: BDT ${dailyExpense.toLocaleString("en-IN")}`,
          ],
        });
        return;
      }

      if (tab === "expenses") {
        await exportPDF({
          title: "Expenses Report",
          columns: ["Title", "Type", "Category", "Amount", "Date"],
          rows: filtered.map((e) => [e.title, e.expense_type, e.category, Number(e.amount), normalizeDate(e.date)]),
        });
      } else if (tab === "booking") {
        await exportPDF({
          title: "Booking Profit Report",
          columns: ["Tracking ID", "Customer", "Package", "Revenue", "Expenses", "Profit"],
          rows: bookingProfit.map((b: any) => [formatTrackingId(b.tracking_id) || "—", b.guest_name || "—", b.package_name || "—", Number(b.total_payments || 0), Number(b.total_expenses || 0), Number(b.profit_amount || 0)]),
        });
      } else if (tab === "package") {
        await exportPDF({
          title: "Package Profit Report",
          columns: ["Package", "Type", "Bookings", "Revenue", "Expenses", "Profit"],
          rows: packageProfit.map((p: any) => [p.package_name || "—", p.package_type || "—", Number(p.total_bookings || 0), Number(p.total_revenue || 0), Number(p.total_expenses || 0), Number(p.profit || 0)]),
        });
      } else if (tab === "customer") {
        await exportPDF({
          title: "Customer Profit Report",
          columns: ["Customer", "Phone", "Bookings", "Payments", "Expenses", "Profit"],
          rows: customerProfit.map((c: any) => [c.full_name || "—", c.phone || "—", Number(c.total_bookings || 0), Number(c.total_payments || 0), Number(c.total_expenses || 0), Number(c.profit || 0)]),
        });
      }
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("PDF export failed");
    }
  };

  const handleTopExportExcel = () => {
    try {
      if (tab === "cashbook") {
        if (!todayCashbookRows.length) {
          toast.error("No cashbook data for today");
          return;
        }
        exportExcel({
          title: `Daily Cashbook ${today}`,
          columns: ["Type", "Category", "Method", "Amount", "Date"],
          rows: todayCashbookRows,
        });
        return;
      }

      if (tab === "expenses") exportExcel({ title: "Expenses Report", columns: ["Title", "Type", "Category", "Amount", "Date"], rows: filtered.map((e) => [e.title, e.expense_type, e.category, Number(e.amount), normalizeDate(e.date)]) });
      else if (tab === "booking") exportExcel({ title: "Booking Profit Report", columns: ["Tracking ID", "Customer", "Package", "Revenue", "Expenses", "Profit"], rows: bookingProfit.map((b: any) => [formatTrackingId(b.tracking_id) || "—", b.guest_name || "—", b.package_name || "—", Number(b.total_payments || 0), Number(b.total_expenses || 0), Number(b.profit_amount || 0)]) });
      else if (tab === "package") exportExcel({ title: "Package Profit Report", columns: ["Package", "Type", "Bookings", "Revenue", "Expenses", "Profit"], rows: packageProfit.map((p: any) => [p.package_name || "—", p.package_type || "—", Number(p.total_bookings || 0), Number(p.total_revenue || 0), Number(p.total_expenses || 0), Number(p.profit || 0)]) });
      else if (tab === "customer") exportExcel({ title: "Customer Profit Report", columns: ["Customer", "Phone", "Bookings", "Payments", "Expenses", "Profit"], rows: customerProfit.map((c: any) => [c.full_name || "—", c.phone || "—", Number(c.total_bookings || 0), Number(c.total_payments || 0), Number(c.total_expenses || 0), Number(c.profit || 0)]) });
    } catch (error) {
      console.error("Excel export failed:", error);
      toast.error("Excel export failed");
    }
  };

  const getBookingLabel = (id: string) => { const b = bookings.find((bk: any) => bk.id === id); return b ? `${formatTrackingId(b.tracking_id)} — ${b.guest_name || "N/A"}` : id?.slice(0, 8); };
  const getCustomerLabel = (id: string) => { const c = customers.find((cu: any) => cu.user_id === id); return c ? `${c.full_name || "N/A"} (${c.phone || ""})` : id?.slice(0, 8); };
  const getPackageLabel = (id: string) => { const p = packages.find((pk: any) => pk.id === id); return p ? p.name : id?.slice(0, 8); };

  const AssignmentFields = ({ data, setData }: { data: any; setData: (d: any) => void }) => (
    <>
      {data.category === "booking" && (
        <select className={inputClass} value={data.booking_id} onChange={(e) => setData({ ...data, booking_id: e.target.value })}>
          <option value="">Select Booking</option>
          {bookings.map((b: any) => <option key={b.id} value={b.id}>{b.tracking_id} — {b.guest_name || "N/A"}</option>)}
        </select>
      )}
      {data.category === "customer" && (
        <select className={inputClass} value={data.customer_id} onChange={(e) => setData({ ...data, customer_id: e.target.value })}>
          <option value="">Select Customer</option>
          {customers.map((c: any) => <option key={c.user_id} value={c.user_id}>{c.full_name || "N/A"} ({c.phone || ""})</option>)}
        </select>
      )}
      {data.category === "package" && (
        <select className={inputClass} value={data.package_id} onChange={(e) => setData({ ...data, package_id: e.target.value })}>
          <option value="">Select Package</option>
          {packages.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
        </select>
      )}
    </>
  );

  const ProfitBadge = ({ value }: { value: number }) => (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${value >= 0 ? "text-emerald bg-emerald/10" : "text-destructive bg-destructive/10"}`}>
      {value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {formatBDT(value)}
    </span>
  );

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="font-heading text-xl font-bold">Accounting & Profit</h2>
        <div className="flex items-center gap-2">
          {canModify && tab === "expenses" && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-sm bg-gradient-gold text-primary-foreground font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity shadow-gold">
              <Plus className="h-4 w-4" /> New Expense
            </button>
          )}
          <button onClick={handleTopExportPDF} className="inline-flex items-center gap-1 text-xs bg-secondary px-3 py-1.5 rounded-md hover:bg-muted transition-colors"><FileDown className="h-3.5 w-3.5" />PDF</button>
          <button onClick={handleTopExportExcel} className="inline-flex items-center gap-1 text-xs bg-secondary px-3 py-1.5 rounded-md hover:bg-muted transition-colors"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
        </div>
      </div>

      {/* Daily Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-emerald/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Today's Income ({today})</p>
          <p className="text-2xl font-heading font-bold text-emerald">{formatBDT(dailyIncome)}</p>
        </div>
        <div className="bg-card border border-destructive/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Today's Expense ({today})</p>
          <p className="text-2xl font-heading font-bold text-destructive">{formatBDT(dailyExpense)}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Income</p>
          <p className="text-2xl font-heading font-bold text-primary">{formatBDT(totalIncome)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Customer: {formatBDT(customerRevenue)} · Moallem: {formatBDT(moallemRevenue)} · Cashbook: {formatBDT(cashbookTotalIncome)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Expense</p>
          <p className="text-2xl font-heading font-bold text-destructive">{formatBDT(totalExpenses)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">General: {formatBDT(totalExpenseAmount)} · Supplier: {formatBDT(supplierExpenseTotal + supplierContractExpenseTotal)} · Commission: {formatBDT(commissionExpenseTotal)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Net Profit</p>
          <p className={`text-2xl font-heading font-bold ${netProfit >= 0 ? "text-emerald" : "text-destructive"}`}>{formatBDT(netProfit)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-sm font-medium px-4 py-2 rounded-md whitespace-nowrap transition-colors ${tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ DAILY CASHBOOK TAB ============ */}
      {tab === "cashbook" && <DailyCashbook onEntriesChanged={fetchData} />}

      {/* ============ EXPENSES TAB ============ */}
      {tab === "expenses" && (
        <>
          {/* Type Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {EXPENSE_TYPES.map(({ value, label }) => (
              <div key={value} className="bg-card border border-border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-heading font-bold text-foreground">{formatBDT(typeTotals[value] || 0)}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select className={inputClass + " w-auto"} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              {EXPENSE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className={inputClass + " w-auto"} value={filterAssign} onChange={(e) => setFilterAssign(e.target.value)}>
              <option value="all">All Assignments</option>
              {ASSIGN_TO.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} expenses</span>
          </div>

          {/* Expense List */}
          <div className="space-y-2">
            {filtered.map((e: any) => (
              <div key={e.id} className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => { if (editingId !== e.id) setViewExpense(e); }}>
                {editingId === e.id ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <input className={inputClass} value={editForm.title} onChange={(ev) => setEditForm({ ...editForm, title: ev.target.value })} />
                    <input className={inputClass} type="number" step="0.01" value={editForm.amount} onChange={(ev) => setEditForm({ ...editForm, amount: ev.target.value })} />
                    <select className={inputClass} value={editForm.expense_type} onChange={(ev) => setEditForm({ ...editForm, expense_type: ev.target.value })}>
                      {EXPENSE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <input className={inputClass} type="date" value={editForm.date} onChange={(ev) => setEditForm({ ...editForm, date: ev.target.value })} />
                    <select className={inputClass} value={editForm.category} onChange={(ev) => setEditForm({ ...editForm, category: ev.target.value, booking_id: "", customer_id: "", package_id: "" })}>
                      {ASSIGN_TO.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <AssignmentFields data={editForm} setData={setEditForm} />
                    <input className={inputClass} placeholder="Note" value={editForm.note} onChange={(ev) => setEditForm({ ...editForm, note: ev.target.value })} />
                    <div className="flex gap-2 items-center sm:col-span-3">
                      <button onClick={saveEdit} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md flex items-center gap-1"><Save className="h-3 w-3" /> Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs bg-secondary px-3 py-1.5 rounded-md">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{e.title}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium capitalize">{EXPENSE_TYPES.find(t => t.value === e.expense_type)?.label || e.expense_type}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">{e.category || "general"}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(e.date).toLocaleDateString()}</span>
                        {e.booking_id && <span className="text-[10px] text-muted-foreground">📋 {getBookingLabel(e.booking_id)}</span>}
                        {e.customer_id && <span className="text-[10px] text-muted-foreground">👤 {getCustomerLabel(e.customer_id)}</span>}
                        {e.package_id && <span className="text-[10px] text-muted-foreground">📦 {getPackageLabel(e.package_id)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      <p className="font-heading font-bold text-destructive">{formatBDT(e.amount)}</p>
                      {canModify && <button onClick={() => startEdit(e)} className="text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>}
                      {canModify && <button onClick={() => setDeleteId(e.id)} className="text-destructive hover:underline"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No expenses found.</p>}
          </div>
        </>
      )}

      {/* ============ BOOKING PROFIT TAB ============ */}
      {tab === "booking" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4">Tracking ID</th>
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Package</th>
                <th className="pb-3 pr-4">Payments</th>
                <th className="pb-3 pr-4">Expenses</th>
                <th className="pb-3 pr-4">Profit</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookingProfit.map((b: any) => (
                <tr key={b.booking_id} className="border-b border-border/50">
                  <td className="py-3 pr-4 font-mono text-xs">{b.tracking_id}</td>
                  <td className="py-3 pr-4 text-sm">{b.guest_name || "—"}</td>
                  <td className="py-3 pr-4 text-sm">{b.package_name || "—"}</td>
                  <td className="py-3 pr-4 font-medium text-primary">{formatBDT(b.total_payments)}</td>
                  <td className="py-3 pr-4 font-medium text-destructive">{formatBDT(b.total_expenses)}</td>
                  <td className="py-3 pr-4"><ProfitBadge value={b.profit} /></td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${b.status === "completed" ? "text-emerald bg-emerald/10" : "text-primary bg-primary/10"}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {bookingProfit.length === 0 && <p className="text-center text-muted-foreground py-12">No booking data.</p>}
          {bookingProfit.length > 0 && (
            <div className="mt-4 bg-card border border-border rounded-lg p-4 flex flex-wrap gap-6">
              <div><p className="text-xs text-muted-foreground">Total Payments</p><p className="font-heading font-bold text-primary">{formatBDT(bookingProfit.reduce((s: number, b: any) => s + Number(b.total_payments), 0))}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Expenses</p><p className="font-heading font-bold text-destructive">{formatBDT(bookingProfit.reduce((s: number, b: any) => s + Number(b.total_expenses), 0))}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Profit</p><p className="font-heading font-bold">{formatBDT(bookingProfit.reduce((s: number, b: any) => s + Number(b.profit), 0))}</p></div>
            </div>
          )}
        </div>
      )}

      {/* ============ PACKAGE PROFIT TAB ============ */}
      {tab === "package" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4">Package</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Bookings</th>
                <th className="pb-3 pr-4">Revenue</th>
                <th className="pb-3 pr-4">Expenses</th>
                <th className="pb-3">Profit</th>
              </tr>
            </thead>
            <tbody>
              {packageProfit.map((p: any) => (
                <tr key={p.package_id} className="border-b border-border/50">
                  <td className="py-3 pr-4 font-medium">{p.package_name}</td>
                  <td className="py-3 pr-4 capitalize text-xs">{p.package_type}</td>
                  <td className="py-3 pr-4">{p.total_bookings}</td>
                  <td className="py-3 pr-4 font-medium text-primary">{formatBDT(p.total_revenue)}</td>
                  <td className="py-3 pr-4 font-medium text-destructive">{formatBDT(p.total_expenses)}</td>
                  <td className="py-3"><ProfitBadge value={p.profit} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {packageProfit.length === 0 && <p className="text-center text-muted-foreground py-12">No package data.</p>}
          {packageProfit.length > 0 && (
            <div className="mt-4 bg-card border border-border rounded-lg p-4 flex flex-wrap gap-6">
              <div><p className="text-xs text-muted-foreground">Total Revenue</p><p className="font-heading font-bold text-primary">{formatBDT(packageProfit.reduce((s: number, p: any) => s + Number(p.total_revenue), 0))}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Expenses</p><p className="font-heading font-bold text-destructive">{formatBDT(packageProfit.reduce((s: number, p: any) => s + Number(p.total_expenses), 0))}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Profit</p><p className="font-heading font-bold">{formatBDT(packageProfit.reduce((s: number, p: any) => s + Number(p.profit), 0))}</p></div>
            </div>
          )}
        </div>
      )}

      {/* ============ CUSTOMER PROFIT TAB ============ */}
      {tab === "customer" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Phone</th>
                <th className="pb-3 pr-4">Bookings</th>
                <th className="pb-3 pr-4">Payments</th>
                <th className="pb-3 pr-4">Expenses</th>
                <th className="pb-3">Profit</th>
              </tr>
            </thead>
            <tbody>
              {customerProfit.map((c: any) => (
                <tr key={c.customer_id} className="border-b border-border/50">
                  <td className="py-3 pr-4 font-medium">{c.full_name || "—"}</td>
                  <td className="py-3 pr-4 text-xs">{c.phone || "—"}</td>
                  <td className="py-3 pr-4">{c.total_bookings}</td>
                  <td className="py-3 pr-4 font-medium text-primary">{formatBDT(c.total_payments)}</td>
                  <td className="py-3 pr-4 font-medium text-destructive">{formatBDT(c.total_expenses)}</td>
                  <td className="py-3"><ProfitBadge value={c.profit} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {customerProfit.length === 0 && <p className="text-center text-muted-foreground py-12">No customer data.</p>}
          {customerProfit.length > 0 && (
            <div className="mt-4 bg-card border border-border rounded-lg p-4 flex flex-wrap gap-6">
              <div><p className="text-xs text-muted-foreground">Total Payments</p><p className="font-heading font-bold text-primary">{formatBDT(customerProfit.reduce((s: number, c: any) => s + Number(c.total_payments), 0))}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Expenses</p><p className="font-heading font-bold text-destructive">{formatBDT(customerProfit.reduce((s: number, c: any) => s + Number(c.total_expenses), 0))}</p></div>
              <div><p className="text-xs text-muted-foreground">Total Profit</p><p className="font-heading font-bold">{formatBDT(customerProfit.reduce((s: number, c: any) => s + Number(c.profit), 0))}</p></div>
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Add New Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Title *</label>
                <input className={inputClass} placeholder="Expense title" required value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Amount (BDT) *</label>
                <input className={inputClass} placeholder="0" type="number" step="0.01" min="1" required value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Expense Type *</label>
                <select className={inputClass} value={form.expense_type} onChange={(e) => setForm({ ...form, expense_type: e.target.value })}>
                  {EXPENSE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Payment Method</label>
                <select className={inputClass} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Date *</label>
                <input className={inputClass} type="date" required value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Assign To</label>
                <select className={inputClass} value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value, booking_id: "", customer_id: "", package_id: "" })}>
                  {ASSIGN_TO.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <AssignmentFields data={form} setData={setForm} />
              </div>
            </div>


            <div>
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <textarea className={inputClass + " resize-none"} rows={2} value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Additional info..." maxLength={500} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-md bg-secondary">Cancel</button>
              <button type="submit"
                className="text-sm px-4 py-2 rounded-md bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-gold flex items-center gap-2">
                <Save className="h-4 w-4" /> Record Expense
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Expense Detail Modal */}
      <Dialog open={!!viewExpense} onOpenChange={(o) => { if (!o) setViewExpense(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Expense Details</DialogTitle>
          </DialogHeader>
          {viewExpense && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><span className="text-muted-foreground text-xs block">Title</span><span className="font-medium text-base">{viewExpense.title}</span></div>
                <div><span className="text-muted-foreground text-xs block">Amount</span><span className="font-bold text-destructive text-lg">{formatBDT(viewExpense.amount)}</span></div>
                <div><span className="text-muted-foreground text-xs block">Date</span><span className="font-medium">{new Date(viewExpense.date).toLocaleDateString()}</span></div>
                <div><span className="text-muted-foreground text-xs block">Type</span><span className="font-medium capitalize">{EXPENSE_TYPES.find(t => t.value === viewExpense.expense_type)?.label || viewExpense.expense_type}</span></div>
                <div><span className="text-muted-foreground text-xs block">Assignment</span><span className="font-medium capitalize">{ASSIGN_TO.find(a => a.value === viewExpense.category)?.label || viewExpense.category || "General"}</span></div>
                {viewExpense.booking_id && (
                  <div className="col-span-2"><span className="text-muted-foreground text-xs block">Booking</span><span className="font-medium">📋 {getBookingLabel(viewExpense.booking_id)}</span></div>
                )}
                {viewExpense.customer_id && (
                  <div className="col-span-2"><span className="text-muted-foreground text-xs block">Customer</span><span className="font-medium">👤 {getCustomerLabel(viewExpense.customer_id)}</span></div>
                )}
                {viewExpense.package_id && (
                  <div className="col-span-2"><span className="text-muted-foreground text-xs block">Package</span><span className="font-medium">📦 {getPackageLabel(viewExpense.package_id)}</span></div>
                )}
                {viewExpense.wallet_account_id && (
                  <div className="col-span-2"><span className="text-muted-foreground text-xs block">Wallet</span><span className="font-medium">{walletAccounts.find(w => w.id === viewExpense.wallet_account_id)?.name || "—"}</span></div>
                )}
              </div>
              {viewExpense.note && (
                <div><span className="text-muted-foreground text-xs block">Notes</span><p>{viewExpense.note}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-2">Delete Expense?</h3>
            <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="text-sm px-4 py-2 rounded-md bg-secondary">Cancel</button>
              <button onClick={confirmDelete} className="text-sm px-4 py-2 rounded-md bg-destructive text-destructive-foreground">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
