import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const emptyForm: any = {
  applicant_name: "", passport_number: "", country_name: "", vendor_name: "", vendor_id: null,
  billing_name: "", client_reference: "", application_date: new Date().toISOString().slice(0, 10),
  billing_amount: 0, our_cost: 0, received_amount: 0, visa_status: "pending",
  submission_date: null, vendor_delivery_date: null, client_delivery_date: null,
  expected_collection_date: null, remarks: "", staff_name: "",
};

export default function AdminVisaPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await apiClient.from("visa_applications").select("*").eq("status", "active").order("created_at", { ascending: false });
    setItems(data || []);
    const { data: v } = await apiClient.from("supplier_agents").select("id, agent_name, company_name").eq("status", "active");
    setVendors(v || []);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.applicant_name || !form.country_name) {
      toast({ title: "Applicant name & country required", variant: "destructive" }); return;
    }
    const payload = { ...form };
    ["id", "invoice_no", "profit", "customer_due", "payment_status"].forEach(k => delete payload[k]);

    if (editing) {
      const { error } = await apiClient.from("visa_applications").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
      toast({ title: "Visa application updated" });
    } else {
      const { error } = await apiClient.from("visa_applications").insert(payload);
      if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
      toast({ title: "Visa application created" });
    }
    setOpen(false); setEditing(null); setForm(emptyForm); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await apiClient.from("visa_applications").update({ status: "deleted" }).eq("id", id);
    load();
  };

  const filtered = items.filter(i => {
    if (filter !== "all" && i.visa_status !== filter) return false;
    if (search && !`${i.invoice_no} ${i.applicant_name} ${i.country_name} ${i.passport_number}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totals = filtered.reduce((a, i) => ({
    billing: a.billing + Number(i.billing_amount), cost: a.cost + Number(i.our_cost),
    received: a.received + Number(i.received_amount), due: a.due + Number(i.customer_due),
    profit: a.profit + Number(i.profit),
  }), { billing: 0, cost: 0, received: 0, due: 0, profit: 0 });

  const visaBadge = (s: string) => {
    const m: Record<string, string> = {
      approved: "bg-green-500/10 text-green-700",
      pending: "bg-yellow-500/10 text-yellow-700",
      rejected: "bg-red-500/10 text-red-700",
      processing: "bg-blue-500/10 text-blue-700",
    };
    return <Badge variant="outline" className={m[s] || ""}>{s.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F4C3A]">Visa Processing <span className="text-base font-normal text-[#C9A96E]" dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic',serif" }}>· معالجة التأشيرات</span></h1>
          <p className="text-sm text-muted-foreground">Track visa applications across the workflow: Pending → Processing → Approved.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); }}}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Visa</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Visa Application</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Staff</Label><Input value={form.staff_name || ""} onChange={e => setForm({ ...form, staff_name: e.target.value })} /></div>
              <div><Label>Applicant Name *</Label><Input value={form.applicant_name || ""} onChange={e => setForm({ ...form, applicant_name: e.target.value })} /></div>
              <div><Label>Passport Number</Label><Input value={form.passport_number || ""} onChange={e => setForm({ ...form, passport_number: e.target.value })} /></div>
              <div><Label>Country *</Label><Input value={form.country_name || ""} onChange={e => setForm({ ...form, country_name: e.target.value })} /></div>
              <div>
                <Label>Vendor</Label>
                <Select value={form.vendor_id || "none"} onValueChange={v => {
                  if (v === "none") setForm({ ...form, vendor_id: null });
                  else {
                    const ven = vendors.find(x => x.id === v);
                    setForm({ ...form, vendor_id: v, vendor_name: ven?.company_name || ven?.agent_name });
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Free text —</SelectItem>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.company_name || v.agent_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Vendor Name (text)</Label><Input value={form.vendor_name || ""} onChange={e => setForm({ ...form, vendor_name: e.target.value })} /></div>
              <div><Label>Billing Name</Label><Input value={form.billing_name || ""} onChange={e => setForm({ ...form, billing_name: e.target.value })} /></div>
              <div><Label>Client Reference</Label><Input value={form.client_reference || ""} onChange={e => setForm({ ...form, client_reference: e.target.value })} /></div>
              <div><Label>Application Date</Label><Input type="date" value={form.application_date || ""} onChange={e => setForm({ ...form, application_date: e.target.value })} /></div>
              <div>
                <Label>Visa Status</Label>
                <Select value={form.visa_status} onValueChange={v => setForm({ ...form, visa_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Billing Amount</Label><Input type="number" value={form.billing_amount ?? 0} onChange={e => setForm({ ...form, billing_amount: Number(e.target.value) })} /></div>
              <div><Label>Our Cost (Visa Fee + Other)</Label><Input type="number" value={form.our_cost ?? 0} onChange={e => setForm({ ...form, our_cost: Number(e.target.value) })} /></div>
              <div><Label>Submission Date</Label><Input type="date" value={form.submission_date || ""} onChange={e => setForm({ ...form, submission_date: e.target.value || null })} /></div>
              <div><Label>Vendor Delivery Date</Label><Input type="date" value={form.vendor_delivery_date || ""} onChange={e => setForm({ ...form, vendor_delivery_date: e.target.value || null })} /></div>
              <div><Label>Client Delivery Date</Label><Input type="date" value={form.client_delivery_date || ""} onChange={e => setForm({ ...form, client_delivery_date: e.target.value || null })} /></div>
              <div><Label>Expected Collection Date</Label><Input type="date" value={form.expected_collection_date || ""} onChange={e => setForm({ ...form, expected_collection_date: e.target.value || null })} /></div>
              <div className="col-span-2"><Label>Remarks</Label><Textarea value={form.remarks || ""} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
              <div className="col-span-2 p-3 rounded-md bg-muted/50 text-sm">
                Profit = {Number(form.billing_amount || 0) - Number(form.our_cost || 0)} BDT &nbsp;|&nbsp;
                Due = {Math.max(0, Number(form.billing_amount || 0) - Number(form.received_amount || 0))} BDT
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[["Billing", totals.billing, "blue"], ["Cost", totals.cost, "orange"], ["Received", totals.received, "green"], ["Due", totals.due, "red"], ["Profit", totals.profit, "purple"]].map(([l, v, c]) => (
          <Card key={l as string}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className={`text-xl font-bold tabular-nums text-${c}-600`}>৳{Number(v).toLocaleString("en-IN")}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Visas ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Applicant</TableHead>
              <TableHead>Country</TableHead><TableHead>Vendor</TableHead>
              <TableHead className="text-right">Billing</TableHead><TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Due</TableHead><TableHead className="text-right">Profit</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(it => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs">{it.invoice_no}</TableCell>
                  <TableCell className="text-xs">{it.application_date}</TableCell>
                  <TableCell>{it.applicant_name}</TableCell>
                  <TableCell>{it.country_name}</TableCell>
                  <TableCell className="text-xs">{it.vendor_name || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(it.billing_amount).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(it.received_amount).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums text-red-600">{Number(it.customer_due).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-600">{Number(it.profit).toLocaleString("en-IN")}</TableCell>
                  <TableCell>{visaBadge(it.visa_status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(it); setForm(it); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No visa applications yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
