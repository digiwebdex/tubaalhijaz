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
  ticket_booking_id: null, passenger_name: "", booking_ref: "", vendor_name: "", vendor_id: null,
  billing_name: "", client_reference: "", refund_date: new Date().toISOString().slice(0, 10),
  terms_of_charge: "refund_charge", billing_amount_was: 0, customer_refund_charge: 0,
  our_refund_charge: 0, refund_back_from_vendor: 0, credit_amount_to_client: 0,
  ticket_costing_was: 0, route: "", remarks: "", staff_name: "",
  credit_status: "pending", wallet_account_id: null,
};

export default function AdminTicketRefundsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const load = async () => {
    const { data } = await apiClient.from("ticket_refunds").select("*").eq("status", "active").order("created_at", { ascending: false });
    setItems(data || []);
    const { data: t } = await apiClient.from("ticket_bookings").select("id, invoice_no, passenger_name, customer_billing_amount, our_cost, route").eq("status", "active");
    setTickets(t || []);
    const { data: w } = await apiClient.from("accounts").select("id, name, balance").eq("type", "asset");
    setWallets(w || []);
  };
  useEffect(() => { load(); }, []);

  const linkTicket = (ticketId: string) => {
    if (ticketId === "none") { setForm({ ...form, ticket_booking_id: null }); return; }
    const t = tickets.find(x => x.id === ticketId);
    if (!t) return;
    setForm({ ...form,
      ticket_booking_id: t.id, passenger_name: t.passenger_name, booking_ref: t.invoice_no,
      route: t.route, billing_amount_was: t.customer_billing_amount, ticket_costing_was: t.our_cost,
    });
  };

  const submit = async () => {
    if (!form.passenger_name) { toast({ title: "Passenger required", variant: "destructive" }); return; }
    const payload = { ...form };
    ["id", "invoice_no", "profit", "due"].forEach(k => delete payload[k]);

    if (editing) {
      const { error } = await apiClient.from("ticket_refunds").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      toast({ title: "Updated" });
    } else {
      const { error } = await apiClient.from("ticket_refunds").insert(payload);
      if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
      toast({ title: "Refund recorded" });
    }
    setOpen(false); setEditing(null); setForm(emptyForm); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await apiClient.from("ticket_refunds").update({ status: "deleted" }).eq("id", id);
    load();
  };

  const totals = items.reduce((a, i) => ({
    customer: a.customer + Number(i.customer_refund_charge),
    our: a.our + Number(i.our_refund_charge),
    fromVendor: a.fromVendor + Number(i.refund_back_from_vendor),
    toClient: a.toClient + Number(i.credit_amount_to_client),
    profit: a.profit + Number(i.profit),
  }), { customer: 0, our: 0, fromVendor: 0, toClient: 0, profit: 0 });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ticket Refunds</h1>
          <p className="text-sm text-muted-foreground">Process ticket cancellations & refund credits to clients.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(emptyForm); }}}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Refund</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Refund</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Link to Ticket Booking (optional)</Label>
                <Select value={form.ticket_booking_id || "none"} onValueChange={linkTicket}>
                  <SelectTrigger><SelectValue placeholder="Select ticket" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {tickets.map(t => <SelectItem key={t.id} value={t.id}>{t.invoice_no} • {t.passenger_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Staff</Label><Input value={form.staff_name || ""} onChange={e => setForm({ ...form, staff_name: e.target.value })} /></div>
              <div><Label>Passenger *</Label><Input value={form.passenger_name || ""} onChange={e => setForm({ ...form, passenger_name: e.target.value })} /></div>
              <div className="col-span-2"><Label>Booking Ref</Label><Input value={form.booking_ref || ""} onChange={e => setForm({ ...form, booking_ref: e.target.value })} /></div>
              <div><Label>Vendor Name</Label><Input value={form.vendor_name || ""} onChange={e => setForm({ ...form, vendor_name: e.target.value })} /></div>
              <div><Label>Billing Name</Label><Input value={form.billing_name || ""} onChange={e => setForm({ ...form, billing_name: e.target.value })} /></div>
              <div><Label>Refund Date</Label><Input type="date" value={form.refund_date || ""} onChange={e => setForm({ ...form, refund_date: e.target.value })} /></div>
              <div><Label>Route</Label><Input value={form.route || ""} onChange={e => setForm({ ...form, route: e.target.value })} /></div>
              <div><Label>Original Billing Amount</Label><Input type="number" value={form.billing_amount_was} onChange={e => setForm({ ...form, billing_amount_was: Number(e.target.value) })} /></div>
              <div><Label>Original Ticket Costing</Label><Input type="number" value={form.ticket_costing_was} onChange={e => setForm({ ...form, ticket_costing_was: Number(e.target.value) })} /></div>
              <div><Label>Customer Refund Charge</Label><Input type="number" value={form.customer_refund_charge} onChange={e => setForm({ ...form, customer_refund_charge: Number(e.target.value) })} /></div>
              <div><Label>Our Refund Charge</Label><Input type="number" value={form.our_refund_charge} onChange={e => setForm({ ...form, our_refund_charge: Number(e.target.value) })} /></div>
              <div><Label>Refund Back from Vendor</Label><Input type="number" value={form.refund_back_from_vendor} onChange={e => setForm({ ...form, refund_back_from_vendor: Number(e.target.value) })} /></div>
              <div><Label>Credit Amount to Client</Label><Input type="number" value={form.credit_amount_to_client} onChange={e => setForm({ ...form, credit_amount_to_client: Number(e.target.value) })} /></div>
              <div>
                <Label>Wallet (for credit payout)</Label>
                <Select value={form.wallet_account_id || "none"} onValueChange={v => setForm({ ...form, wallet_account_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.name} (৳{Number(w.balance).toLocaleString("en-IN")})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Credit Status</Label>
                <Select value={form.credit_status} onValueChange={v => setForm({ ...form, credit_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Remarks</Label><Textarea value={form.remarks || ""} onChange={e => setForm({ ...form, remarks: e.target.value })} /></div>
              <div className="col-span-2 p-3 rounded-md bg-muted/50 text-sm">
                Profit = {Number(form.customer_refund_charge || 0) - Number(form.our_refund_charge || 0)} BDT
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
        {[["Customer Charge", totals.customer, "blue"], ["Our Charge", totals.our, "orange"], ["Refund from Vendor", totals.fromVendor, "green"], ["Credit to Client", totals.toClient, "red"], ["Profit", totals.profit, "purple"]].map(([l, v, c]) => (
          <Card key={l as string}><CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className={`text-lg font-bold tabular-nums text-${c}-600`}>৳{Number(v).toLocaleString("en-IN")}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>All Refunds ({items.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Passenger</TableHead>
              <TableHead>Booking Ref</TableHead><TableHead className="text-right">Cust. Charge</TableHead>
              <TableHead className="text-right">Our Charge</TableHead><TableHead className="text-right">From Vendor</TableHead>
              <TableHead className="text-right">To Client</TableHead><TableHead className="text-right">Profit</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map(it => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs">{it.invoice_no}</TableCell>
                  <TableCell className="text-xs">{it.refund_date}</TableCell>
                  <TableCell>{it.passenger_name}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{it.booking_ref}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(it.customer_refund_charge).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(it.our_refund_charge).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(it.refund_back_from_vendor).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(it.credit_amount_to_client).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right tabular-nums text-green-600">{Number(it.profit).toLocaleString("en-IN")}</TableCell>
                  <TableCell><Badge variant="outline">{it.credit_status?.toUpperCase()}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(it); setForm(it); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No refunds yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
