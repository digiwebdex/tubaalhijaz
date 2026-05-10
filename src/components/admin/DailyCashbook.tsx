import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Save, X, FileDown, FileSpreadsheet, TrendingUp, TrendingDown } from "lucide-react";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { useCanModifyFinancials } from "@/components/admin/AdminLayout";
import { formatBDT } from "@/lib/utils";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

const INCOME_CATEGORIES = [
  { value: "customer_payment", label: "Customer Payment" },
  { value: "moallem_payment", label: "Moallem Deposit" },
  { value: "umrah_payment", label: "Umrah Payment" },
  { value: "agent_payment", label: "Agent Payment" },
  { value: "other_income", label: "Other Income" },
];

const EXPENSE_CATEGORIES = [
  { value: "car_rent", label: "Car Rent" },
  { value: "salary", label: "Salary" },
  { value: "office", label: "Office Expense" },
  { value: "ticket", label: "Ticket Cost" },
  { value: "visa", label: "Visa Cost" },
  { value: "hotel", label: "Hotel Cost" },
  { value: "food", label: "Food Cost" },
  { value: "transport", label: "Transport Cost" },
  { value: "inventory", label: "Inventory Cost" },
  { value: "commission", label: "Commission" },
  { value: "marketing", label: "Marketing" },
  { value: "other_expense", label: "Other Expense" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank", label: "Bank" },
  { value: "manual", label: "Manual" },
];


const EMPTY_FORM = {
  type: "income" as "income" | "expense",
  description: "",
  amount: "",
  category: "customer_payment",
  wallet_account_id: "",
  payment_method: "cash",
  notes: "",
  date: new Date().toISOString().split("T")[0],
};

interface DailyCashbookProps {
  onEntriesChanged?: () => void | Promise<void>;
}

export default function DailyCashbook({ onEntriesChanged }: DailyCashbookProps = {}) {
  const canModify = useCanModifyFinancials();
  const [entries, setEntries] = useState<any[]>([]);
  const [walletAccounts, setWalletAccounts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewType, setViewType] = useState<"all" | "income" | "expense">("all");

  const fetchData = async () => {
    const [entryRes, walletRes] = await Promise.all([
      apiClient.from("daily_cashbook" as any).select("*").order("created_at", { ascending: false }),
      apiClient.from("accounts" as any).select("*").eq("type", "asset"),
    ]);
    setEntries((entryRes.data as any[]) || []);
    setWalletAccounts((walletRes.data as any[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) { toast.error("Description is required"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    const payload: any = {
      type: form.type,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      wallet_account_id: form.wallet_account_id || null,
      payment_method: form.payment_method,
      notes: form.notes.trim() || null,
      date: form.date,
    };
    const { error } = await apiClient.from("daily_cashbook" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(form.type === "income" ? "Income recorded" : "Expense recorded");
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
    await fetchData();
    await onEntriesChanged?.();
  };

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setEditForm({
      type: entry.type, description: entry.description, amount: entry.amount,
      category: entry.category, wallet_account_id: entry.wallet_account_id || "",
      payment_method: entry.payment_method || "cash", notes: entry.notes || "", date: entry.date,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await apiClient.from("daily_cashbook" as any).update({
      type: editForm.type, description: editForm.description, amount: parseFloat(editForm.amount),
      category: editForm.category, wallet_account_id: editForm.wallet_account_id || null,
      payment_method: editForm.payment_method, notes: editForm.notes || null, date: editForm.date,
    }).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated successfully");
    setEditingId(null);
    await fetchData();
    await onEntriesChanged?.();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await apiClient.from("daily_cashbook" as any).delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted successfully");
    setDeleteId(null);
    await fetchData();
    await onEntriesChanged?.();
  };

  const normalizeDate = (d: string) => d ? d.substring(0, 10) : "";

  const filtered = useMemo(() => {
    return entries.filter((e: any) => {
      if (normalizeDate(e.date) !== selectedDate) return false;
      if (viewType !== "all" && e.type !== viewType) return false;
      return true;
    });
  }, [entries, selectedDate, viewType]);

  const dailyIncome = useMemo(() =>
    entries.filter((e: any) => normalizeDate(e.date) === selectedDate && e.type === "income").reduce((s: number, e: any) => s + Number(e.amount), 0),
    [entries, selectedDate]);

  const dailyExpense = useMemo(() =>
    entries.filter((e: any) => normalizeDate(e.date) === selectedDate && e.type === "expense").reduce((s: number, e: any) => s + Number(e.amount), 0),
    [entries, selectedDate]);

  const dailyBalance = dailyIncome - dailyExpense;

  const getCategoryLabel = (type: string, category: string) => {
    const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    return list.find(c => c.value === category)?.label || category;
  };

  const getWalletName = (id: string) => {
    return walletAccounts.find((w: any) => w.id === id)?.name || "—";
  };

  const dateGroups = useMemo(() => {
    const groups: Record<string, { income: number; expense: number; count: number }> = {};
    entries.forEach((e: any) => {
      const d = normalizeDate(e.date);
      if (!groups[d]) groups[d] = { income: 0, expense: 0, count: 0 };
      groups[d].count++;
      if (e.type === "income") groups[d].income += Number(e.amount);
      else groups[d].expense += Number(e.amount);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)).slice(0, 7);
  }, [entries]);

  const handleExportPDF = async () => {
    try {
      if (!filtered.length) {
        toast.error("No data to export for this date");
        return;
      }
      await exportPDF({
        title: `Daily Cashbook ${selectedDate}`,
        columns: ["Type", "Description", "Category", "Amount", "Method"],
        rows: filtered.map(e => [
          e.type === "income" ? "Income" : "Expense",
          e.description,
          getCategoryLabel(e.type, e.category),
          Number(e.amount),
          PAYMENT_METHODS.find(p => p.value === e.payment_method)?.label || e.payment_method,
        ]),
        summary: [`Total Income: BDT ${dailyIncome.toLocaleString("en-IN")} | Total Expense: BDT ${dailyExpense.toLocaleString("en-IN")} | Balance: BDT ${dailyBalance.toLocaleString("en-IN")}`],
      });
    } catch (error) {
      console.error("Daily cashbook PDF export failed:", error);
      toast.error("PDF export failed");
    }
  };

  const handleExportExcel = () => {
    try {
      if (!filtered.length) {
        toast.error("No data to export for this date");
        return;
      }
      exportExcel({
        title: `Daily Cashbook ${selectedDate}`,
        columns: ["Type", "Description", "Category", "Amount", "Method"],
        rows: filtered.map(e => [
          e.type === "income" ? "Income" : "Expense",
          e.description,
          getCategoryLabel(e.type, e.category),
          Number(e.amount),
          PAYMENT_METHODS.find(p => p.value === e.payment_method)?.label || e.payment_method,
        ]),
      });
    } catch (error) {
      console.error("Daily cashbook Excel export failed:", error);
      toast.error("Excel export failed");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Date:</label>
          <input type="date" className={inputClass + " w-auto"} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "income", "expense"] as const).map(t => (
            <button key={t} onClick={() => setViewType(t)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${viewType === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "all" ? "All" : t === "income" ? "Income" : "Expense"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {canModify && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 text-sm bg-gradient-gold text-primary-foreground font-semibold px-4 py-2 rounded-md hover:opacity-90 transition-opacity shadow-gold">
              <Plus className="h-4 w-4" /> New Entry
            </button>
          )}
          <button onClick={handleExportPDF} className="inline-flex items-center gap-1 text-xs bg-secondary px-3 py-1.5 rounded-md hover:bg-muted"><FileDown className="h-3.5 w-3.5" />PDF</button>
          <button onClick={handleExportExcel} className="inline-flex items-center gap-1 text-xs bg-secondary px-3 py-1.5 rounded-md hover:bg-muted"><FileSpreadsheet className="h-3.5 w-3.5" />Excel</button>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-emerald/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Income</p>
          <p className="text-2xl font-heading font-bold text-emerald">{formatBDT(dailyIncome)}</p>
        </div>
        <div className="bg-card border border-destructive/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Expense</p>
          <p className="text-2xl font-heading font-bold text-destructive">{formatBDT(dailyExpense)}</p>
        </div>
        <div className={`bg-card border rounded-lg p-4 ${dailyBalance >= 0 ? "border-emerald/30" : "border-destructive/30"}`}>
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className={`text-2xl font-heading font-bold ${dailyBalance >= 0 ? "text-emerald" : "text-destructive"}`}>
            {dailyBalance >= 0 ? <TrendingUp className="inline h-5 w-5 mr-1" /> : <TrendingDown className="inline h-5 w-5 mr-1" />}
            {formatBDT(Math.abs(dailyBalance))}
          </p>
        </div>
      </div>

      {/* Recent Days Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        {dateGroups.map(([date, data]) => (
          <button key={date} onClick={() => setSelectedDate(date)}
            className={`bg-card border rounded-lg p-2 text-center text-xs transition-colors hover:border-primary/50 ${selectedDate === date ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>
            <p className="font-medium text-foreground mb-1">{new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
            <p className="text-emerald">{formatBDT(data.income)}</p>
            <p className="text-destructive">{formatBDT(data.expense)}</p>
          </button>
        ))}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-lg font-bold">New Entry</h3>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: "income", category: "customer_payment" })}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${form.type === "income" ? "bg-emerald/20 text-emerald border border-emerald/40" : "bg-secondary text-muted-foreground"}`}>
                  Income
                </button>
                <button type="button" onClick={() => setForm({ ...form, type: "expense", category: "car_rent" })}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${form.type === "expense" ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-secondary text-muted-foreground"}`}>
                  Expense
                </button>
              </div>

              <input className={inputClass} placeholder="Description *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <input className={inputClass} type="number" placeholder="Amount (BDT) *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} min="1" />
              
              <div className="grid grid-cols-2 gap-3">
                <select className={inputClass} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <select className={inputClass} value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>

              <input className={inputClass} placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              
              <button type="submit" className="w-full bg-gradient-gold text-primary-foreground font-semibold py-2.5 rounded-md hover:opacity-90 transition-opacity shadow-gold">
                {form.type === "income" ? "Record Income" : "Record Expense"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold mb-3">Delete this entry?</h3>
            <p className="text-sm text-muted-foreground mb-4">This entry will be permanently deleted.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm bg-secondary rounded-md">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-sm bg-destructive text-white rounded-md">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="space-y-2">
        {filtered.map((e: any) => (
          <div key={e.id} className="bg-card border border-border rounded-lg p-4">
            {editingId === e.id ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex gap-2 sm:col-span-3">
                  <button type="button" onClick={() => setEditForm({ ...editForm, type: "income" })}
                    className={`flex-1 py-1.5 rounded text-xs font-medium ${editForm.type === "income" ? "bg-emerald/20 text-emerald" : "bg-secondary text-muted-foreground"}`}>Income</button>
                  <button type="button" onClick={() => setEditForm({ ...editForm, type: "expense" })}
                    className={`flex-1 py-1.5 rounded text-xs font-medium ${editForm.type === "expense" ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}>Expense</button>
                </div>
                <input className={inputClass} value={editForm.description} onChange={ev => setEditForm({ ...editForm, description: ev.target.value })} />
                <input className={inputClass} type="number" value={editForm.amount} onChange={ev => setEditForm({ ...editForm, amount: ev.target.value })} />
                <select className={inputClass} value={editForm.category} onChange={ev => setEditForm({ ...editForm, category: ev.target.value })}>
                  {(editForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select className={inputClass} value={editForm.payment_method} onChange={ev => setEditForm({ ...editForm, payment_method: ev.target.value })}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <input className={inputClass} type="date" value={editForm.date} onChange={ev => setEditForm({ ...editForm, date: ev.target.value })} />
                <input className={inputClass} placeholder="Notes" value={editForm.notes} onChange={ev => setEditForm({ ...editForm, notes: ev.target.value })} />
                <div className="flex gap-2 items-center sm:col-span-3">
                  <button onClick={saveEdit} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md flex items-center gap-1"><Save className="h-3 w-3" /> Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs bg-secondary px-3 py-1.5 rounded-md">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${e.type === "income" ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"}`}>
                      {e.type === "income" ? "Income" : "Expense"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{getCategoryLabel(e.type, e.category)}</span>
                    <span className="text-[10px] text-muted-foreground">{PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label || e.payment_method}</span>
                  </div>
                  <p className="font-medium text-sm truncate">{e.description}</p>
                  {e.notes && <p className="text-xs text-muted-foreground truncate">{e.notes}</p>}
                  
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className={`font-heading font-bold ${e.type === "income" ? "text-emerald" : "text-destructive"}`}>{formatBDT(e.amount)}</p>
                  {canModify && (
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(e)} className="text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteId(e.id)} className="text-destructive hover:underline"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">No entries found for this date.</p>}
      </div>
    </div>
  );
}