import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { useIsViewer } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import AdminActionMenu, { ActionItem } from "@/components/admin/AdminActionMenu";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, Search, Users, ChevronLeft, ChevronRight, FileDown, FileSpreadsheet } from "lucide-react";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { normalizePhone, getPhoneError, handlePhoneChange } from "@/lib/phoneValidation";
import { formatBDT } from "@/lib/utils";

const PAGE_SIZE = 15;

interface Moallem {
  id: string; name: string; phone: string | null; address: string | null;
  nid_number: string | null; contract_date: string | null; notes: string | null;
  status: string; total_deposit: number; total_due: number;
  contracted_hajji: number; contracted_amount: number;
  created_at: string; updated_at: string;
}

const emptyForm = { name: "", phone: "", address: "", nid_number: "", contract_date: "", notes: "", status: "active", contracted_hajji: "", contracted_amount: "" };

export default function AdminMoallemsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isViewer = useIsViewer();
  const [moallems, setMoallems] = useState<Moallem[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const [m, b] = await Promise.all([
      apiClient.from("moallems").select("*").order("created_at", { ascending: false }),
      apiClient.from("bookings").select("id, moallem_id, num_travelers, total_amount, paid_by_moallem, moallem_due"),
    ]);
    if (m.data) setMoallems(m.data);
    if (b.data) setBookings(b.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Aggregate booking data per moallem — use trigger-maintained values for accuracy
  const moallemStats = useMemo(() => {
    const map: Record<string, { hajji: number; received: number; due: number; contractDue: number }> = {};
    // Count actual booked pilgrims per moallem from bookings
    const pilgrimCount: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.moallem_id) {
        pilgrimCount[b.moallem_id] = (pilgrimCount[b.moallem_id] || 0) + (Number(b.num_travelers) || 0);
      }
    });
    moallems.forEach(m => {
      const received = Number(m.total_deposit || 0);
      const bookingDue = Number(m.total_due || 0);
      const contractDue = Math.max(0, Number(m.contracted_amount || 0) - received);
      map[m.id] = { hajji: pilgrimCount[m.id] || 0, received, due: bookingDue, contractDue };
    });
    return map;
  }, [moallems, bookings]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required.", variant: "destructive" }); return; }
    if (form.phone.trim()) {
      const phoneErr = getPhoneError(form.phone);
      if (phoneErr) { toast({ title: phoneErr, variant: "destructive" }); return; }
    }
    const payload = {
      name: form.name.trim(), phone: form.phone.trim() ? normalizePhone(form.phone) : null,
      address: form.address.trim() || null, nid_number: form.nid_number.trim() || null,
      contract_date: form.contract_date || null, notes: form.notes.trim() || null, status: form.status,
      contracted_hajji: parseInt(form.contracted_hajji) || 0,
      contracted_amount: parseFloat(form.contracted_amount) || 0,
    };
    if (editId) {
      const { error } = await apiClient.from("moallems").update(payload).eq("id", editId);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Moallem updated successfully" });
    } else {
      const { error } = await apiClient.from("moallems").insert(payload);
      if (error) { toast({ title: "Creation failed", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Moallem created successfully" });
    }
    setShowForm(false); setEditId(null); setForm(emptyForm); fetchData();
  };

  const startEdit = (m: Moallem) => {
    setForm({ name: m.name, phone: m.phone || "", address: m.address || "", nid_number: m.nid_number || "", contract_date: m.contract_date || "", notes: m.notes || "", status: m.status, contracted_hajji: String(m.contracted_hajji || ""), contracted_amount: String(m.contracted_amount || "") });
    setEditId(m.id); setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await apiClient.from("moallems").delete().eq("id", deleteId);
    if (error) { toast({ title: "Failed to delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Moallem deleted successfully" }); setDeleteId(null); fetchData();
  };

  const filtered = moallems.filter(m => {
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || (m.phone || "").includes(q) || (m.nid_number || "").includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search]);

  const getActions = (m: Moallem): ActionItem[] => {
    const stats = moallemStats[m.id] || { hajji: 0, received: 0, due: 0 };
    return [
      { label: "View", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate(`/admin/moallems/${m.id}`) },
      { label: "PDF", icon: <FileDown className="h-3.5 w-3.5" />, onClick: () => exportPDF({ title: `Moallem - ${m.name}`, columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows: [[m.name, m.phone || "—", m.contracted_hajji || 0, m.contracted_amount || 0, stats.received, stats.due]], summary: [`Total Paid: BDT ${stats.received.toLocaleString("en-IN")}`, `Total Due: BDT ${stats.due.toLocaleString("en-IN")}`] }) },
      { label: "Edit", icon: <Pencil className="h-3.5 w-3.5" />, onClick: () => startEdit(m), variant: "warning", hidden: isViewer },
      { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteId(m.id), variant: "destructive", hidden: isViewer, separator: true },
    ];
  };

  // Summary KPIs
  const totals = useMemo(() => {
    let hajji = 0, received = 0, due = 0, contractedHajji = 0, contractedAmount = 0;
    Object.values(moallemStats).forEach(s => { hajji += s.hajji; received += s.received; due += s.due; });
    moallems.forEach(m => { contractedHajji += Number(m.contracted_hajji || 0); contractedAmount += Number(m.contracted_amount || 0); });
    return { hajji, received, due, contractedHajji, contractedAmount };
  }, [moallemStats, moallems]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Moallem Management
          </h1>
          <p className="text-muted-foreground text-sm">Total {moallems.length} Moallems</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { const rows = filtered.map(m => { const s = moallemStats[m.id] || { hajji: 0, received: 0, due: 0 }; return [m.name, m.phone || "—", m.contracted_hajji || 0, m.contracted_amount || 0, s.received, s.due]; }); exportPDF({ title: "Moallems Report", columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows, summary: [`Total Paid: BDT ${totals.received.toLocaleString("en-IN")}`, `Total Due: BDT ${totals.due.toLocaleString("en-IN")}`] }); }}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" size="sm" onClick={() => { const rows = filtered.map(m => { const s = moallemStats[m.id] || { hajji: 0, received: 0, due: 0 }; return [m.name, m.phone || "—", m.contracted_hajji || 0, m.contracted_amount || 0, s.received, s.due]; }); exportExcel({ title: "Moallems Report", columns: ["Name", "Phone", "Pilgrim Count", "Contract Amount", "Total Paid", "Total Due"], rows, summary: [`Total Paid: BDT ${totals.received.toLocaleString("en-IN")}`, `Total Due: BDT ${totals.due.toLocaleString("en-IN")}`] }); }}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
          {!isViewer && (
            <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New Moallem
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Moallems</p>
          <p className="text-lg font-bold text-foreground">{moallems.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Contracted Pilgrims</p>
          <p className="text-lg font-bold text-foreground">{totals.contractedHajji}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Contracted Amount</p>
          <p className="text-lg font-bold text-foreground">{formatBDT(totals.contractedAmount)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Received</p>
          <p className="text-lg font-bold text-emerald-600">{formatBDT(totals.received)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Due</p>
          <p className="text-lg font-bold text-destructive">{formatBDT(totals.due)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone or NID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No moallems found</p>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12 text-center">SL</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Contracted Pilgrims</TableHead>
                  <TableHead className="text-right">Contracted Amount</TableHead>
                  <TableHead className="text-right">Total Received</TableHead>
                  <TableHead className="text-right">Total Due</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((m, i) => {
                  const stats = moallemStats[m.id] || { hajji: 0, received: 0, due: 0 };
                  return (
                    <TableRow key={m.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/admin/moallems/${m.id}`)}>
                      <TableCell className="text-center text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground">{m.phone || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{stats.hajji}</TableCell>
                      <TableCell className="text-right font-medium">{formatBDT(m.contracted_amount || 0)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatBDT(stats.received)}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">{formatBDT(stats.due)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {m.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                        <AdminActionMenu actions={getActions(m)} inlineCount={1} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
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
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditId(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Moallem" : "New Moallem"}</DialogTitle>
            <DialogDescription>Fill in the moallem details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium">Name *</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={e => handlePhoneChange(e.target.value, (v) => setForm({ ...form, phone: v }))} placeholder="01XXXXXXXXX" maxLength={15} />
              {form.phone.trim() && getPhoneError(form.phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(form.phone)}</p>}
            </div>
            <div><label className="text-sm font-medium">Address</label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="text-sm font-medium">NID Number</label><Input value={form.nid_number} onChange={e => setForm({ ...form, nid_number: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Contract Date</label><Input type="date" value={form.contract_date} onChange={e => setForm({ ...form, contract_date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Contracted Pilgrims</label><Input type="number" min={0} value={form.contracted_hajji} onChange={e => setForm({ ...form, contracted_hajji: e.target.value })} placeholder="0" /></div>
              <div><label className="text-sm font-medium">Contracted Amount (BDT)</label><Input type="number" min={0} value={form.contracted_amount} onChange={e => setForm({ ...form, contracted_amount: e.target.value })} placeholder="0" /></div>
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
            <DialogDescription>This moallem will be permanently deleted.</DialogDescription>
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
