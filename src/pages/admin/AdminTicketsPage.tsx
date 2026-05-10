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
import { Plus, Pencil, Trash2, CreditCard, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TicketBooking {
  id: string;
  invoice_no: string;
  passenger_name: string;
  booking_ref: string | null;
  vendor_name: string | null;
  vendor_id: string | null;
  billing_name: string | null;
  client_reference: string | null;
  issue_date: string;
  terms_of_charge: string;
  customer_billing_amount: number;
  our_cost: number;
  received_amount: number;
  customer_due: number;
  profit: number;
  payment_status: string;
  departure_date: string | null;
  arrival_date: string | null;
  route: string | null;
  expected_collection_date: string | null;
  remarks: string | null;
  staff_name: string | null;
}

const emptyForm: Partial<TicketBooking> = {
  passenger_name: "", booking_ref: "", vendor_name: "", vendor_id: null, billing_name: "",
  client_reference: "", issue_date: new Date().toISOString().slice(0, 10),
  terms_of_charge: "newly_issue", customer_billing_amount: 0, our_cost: 0, received_amount: 0,
  departure_date: null, arrival_date: null, route: "", expected_collection_date: null,
  remarks: "", staff_name: "",
};

export default function AdminTicketsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<TicketBooking[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TicketBooking | null>(null);
  const [form, setForm] = useState<Partial<TicketBooking>>(emptyForm);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await apiClient.from("ticket_bookings").select("*").eq("status", "active").order("created_at", { ascending: false });
    setItems((data as any) || []);
    const { data: v } = await apiClient.from("supplier_agents").select("id, agent_name, company_name").eq("status", "active");
    setVendors(v || []);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.passenger_name) {
      toast({ title: "Passenger name required", variant: "destructive" });
      return;
    }
    const payload = { ...form };
    delete (payload as any).id;
    delete (payload as any).invoice_no;
    delete (payload as any).profit;
    delete (payload as any).customer_due;
    delete (payload as any).payment_status;

    if (editing) {
      const { error } = await apiClient.from("ticket_bookings").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
      toast({ title: "Ticket booking updated" });
    } else {
      const { error } = await apiClient.from("ticket_bookings").insert(payload as any);
      if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
      toast({ title: "Ticket booking created" });
    }
    setOpen(false); setEditing(null); setForm(emptyForm); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Soft-delete this ticket booking?")) return;
    const { error } = await apiClient.from("ticket_bookings").update({ status: "deleted" }).eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  const openEdit = (it: TicketBooking) => {
    setEditing(it); setForm(it); setOpen(true);
  };

  const filtered = items.filter(i => {
    if (filter !== "all" && i.payment_status !== filter) return false;
    if (search && !`${i.invoice_no} ${i.passenger_name} ${i.billing_name} ${i.booking_ref}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totals = filtered.reduce((acc, i) => ({
    billing: acc.billing + Number(i.customer_billing_amount),
    cost: acc.cost + Number(i.our_cost),
    received: acc.received + Number(i.received_amount),
    due: acc.due + Number(i.customer_due),
    profit: acc.profit + Number(i.profit),
  }), { billing: 0, cost: 0, received: 0, due: 0, profit: 0 });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      paid: "bg-green-500/10 text-green-700 border-green-500/30",
      partial: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
      due: "bg-red-500/10 text-red-700 border-red-500/30",
    };
    return <Badge variant="outline" className={map[s] || ""}>{s.toUpperCase()}</Badge>;
  };

  const isOverdue = (it: TicketBooking) => {
    if (!it.expected_collection_date || it.payment_status === "paid") return false;
    return new Date(it.expected_collection_date) < new Date();
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Air Ticket Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage ticket sales, dues, and customer collections.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); }}}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Ticket</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Ticket Booking</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Staff</Label><Input value={form.staff_name || ""} onChange={e => setForm({ ...form, staff_name: e.target.value })} /></div>
              <div><Label>Passenger Name *</Label><Input value={form.passenger_name || ""} onChange={e => setForm({ ...form, passenger_name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Booking Ref / Ticket Number</Label><Input value={form.booking_ref || ""} onChange={e => setForm({ ...form, booking_ref: e.target.value })} /></div>
              <div>
                <Label>Vendor</Label>
                <Select value={form.vendor_id || "none"} onValueChange={v => {
                  if (v === "none") { setForm({ ...form, vendor_id: null, vendor_name: form.vendor_name }); }
                  else {
                    const ven = vendors.find(x => x.id === v);
                    setForm({ ...form, vendor_id: v, vendor_name: ven?.company_name || ven?.agent_name });
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Free text —</SelectItem>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.company_name || v.agent_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Vendor Name (text)</Label><Input value={form.vendor_name || ""} onChange={e => setForm({ ...form, vendor_name: e.target.value })} placeholder="e.g. bdfare" /></div>
              <div><Label>Billing Name</Label><Input value={form.billing_name || ""} onChange={e => setForm({ ...form, billing_name: e.target.value })} /></div>
              <div><Label>Client Reference</Label><Input value={form.client_reference || ""} onChange={e => setForm({ ...form, client_reference: e.target.value })} /></div>
              <div><Label>Issue Date</Label><Input type="date" value={form.issue_date || ""} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div>
                <Label>Terms of Charge</Label>
                <Select value={form.terms_of_charge || "newly_issue"} onValueChange={v => setForm({ ...form, terms_of_charge: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newly_issue">Newly Issue</SelectItem>
                    <SelectItem value="reissue_cost">Reissue Cost</SelectItem>
                    <SelectItem value="reissue_full">Reissue Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Customer Billing Amount</Label><Input type="number" value={form.customer_billing_amount ?? 0} onChange={e => setForm({ ...form, customer_billing_amount: Number(e.target.value) })} /></div>
              <div><Label>Our Cost</Label><Input type="number" value={form.our_cost ?? 0} onChange={e => setForm({ ...form, our_cost: Number(e.target.value) })} /></div>
              <div><Label>Departure Date</Label><Input type="date" value={form.departure_date || ""} onChange={e => setForm({ ...form, departure_date: e.target.value || null })} /></div>
              <div><Label>Arrival Date</Label><Input type="date" value={form.arrival_date || ""} onChange={e => setForm({ ...form, arrival_date: e.target.value || null })} /></div>
              <div className="col-span-2"><Label>Route</Label><Input value={form.route || ""} onChange={e => setForm({ ...form, route: e.target.value })} placeholder="e.g. DAC-SPD (BG)" /></div>
              <div><Label>Expected Collection Date</Label><Input type="date" value={form.expected_collection_date || ""} onChange={e => setForm({ ...form, expected_collection_date: e.target.value || null })} /></div>
              <div className="col-span-2"><Label>Remarks</Label><Textarea value={form.remarks || ""} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
              <div className="col-span-2 p-3 rounded-md bg-muted/50 text-sm">
                <strong>Live preview:</strong> Profit = {Number(form.customer_billing_amount || 0) - Number(form.our_cost || 0)} BDT &nbsp;|&nbsp;
                Due = {Math.max(0, Number(form.customer_billing_amount || 0) - Number(form.received_amount || 0))} BDT
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters + summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Billing", value: totals.billing, color: "text-blue-600" },
          { label: "Total Cost", value: totals.cost, color: "text-orange-600" },
          { label: "Received", value: totals.received, color: "text-green-600" },
          { label: "Due", value: totals.due, color: "text-red-600" },
          { label: "Profit", value: totals.profit, color: "text-purple-600" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`text-xl font-bold tabular-nums ${s.color}`}>৳{s.value.toLocaleString("en-IN")}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Tickets ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="due">Due</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">Billing</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Collection</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(it => (
                <TableRow key={it.id} className={isOverdue(it) ? "bg-red-50 dark:bg-red-950/20" : ""}>
                  <TableCell className="font-mono text-xs">{it.invoice_no}</TableCell>
                  <TableCell className="text-xs">{it.issue_date}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={it.passenger_name}>{it.passenger_name}</TableCell>
                  <TableCell className="text-xs">{it.vendor_name || "—"}</TableCell>
                  <TableCell className="text-xs">{it.route || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(it.customer_billing_amount).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(it.received_amount).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums text-red-600 font-medium">{Number(it.customer_due).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-600">{Number(it.profit).toLocaleString("en-IN")}</TableCell>
                  <TableCell>{statusBadge(it.payment_status)}</TableCell>
                  <TableCell className="text-xs">
                    {it.expected_collection_date ? (
                      <div className="flex items-center gap-1">
                        {isOverdue(it) && <AlertCircle className="h-3 w-3 text-red-500" />}
                        {it.expected_collection_date}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(it)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">No ticket bookings yet. Click "New Ticket" to add one.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
