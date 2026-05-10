import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SourceOption {
  id: string;
  source_type: "ticket" | "visa" | "refund";
  invoice_no: string;
  label: string;
  due: number;
}

export default function AdminSettlementsPage() {
  const { toast } = useToast();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState<any>({
    settlement_date: new Date().toISOString().slice(0, 10),
    payer_name: "", payment_method: "cash", wallet_account_id: null, notes: "",
  });
  const [allocations, setAllocations] = useState<{ source_type: string; source_id: string; invoice_no: string; amount_applied: number }[]>([]);

  const load = async () => {
    const [s, it, w, t, v, r] = await Promise.all([
      apiClient.from("settlements").select("*").order("created_at", { ascending: false }),
      apiClient.from("settlement_items").select("*"),
      apiClient.from("accounts").select("id, name, balance").eq("type", "asset"),
      apiClient.from("ticket_bookings").select("id, invoice_no, passenger_name, customer_due").eq("status", "active").gt("customer_due", 0),
      apiClient.from("visa_applications").select("id, invoice_no, applicant_name, customer_due").eq("status", "active").gt("customer_due", 0),
      apiClient.from("ticket_refunds").select("id, invoice_no, passenger_name, due").eq("status", "active").gt("due", 0),
    ]);
    setSettlements(s.data || []);
    setItems(it.data || []);
    setWallets(w.data || []);
    const opts: SourceOption[] = [
      ...(t.data || []).map((x: any) => ({ id: x.id, source_type: "ticket" as const, invoice_no: x.invoice_no, label: `${x.invoice_no} • ${x.passenger_name}`, due: Number(x.customer_due) })),
      ...(v.data || []).map((x: any) => ({ id: x.id, source_type: "visa" as const, invoice_no: x.invoice_no, label: `${x.invoice_no} • ${x.applicant_name}`, due: Number(x.customer_due) })),
      ...(r.data || []).map((x: any) => ({ id: x.id, source_type: "refund" as const, invoice_no: x.invoice_no, label: `${x.invoice_no} • ${x.passenger_name} (refund)`, due: Number(x.due) })),
    ];
    setSources(opts);
  };
  useEffect(() => { load(); }, []);

  const addAllocation = (sourceKey: string) => {
    const [type, id] = sourceKey.split(":");
    const src = sources.find(s => s.source_type === type && s.id === id);
    if (!src) return;
    if (allocations.find(a => a.source_id === id)) { toast({ title: "Already added" }); return; }
    setAllocations([...allocations, { source_type: type, source_id: id, invoice_no: src.invoice_no, amount_applied: src.due }]);
  };

  const removeAlloc = (idx: number) => setAllocations(allocations.filter((_, i) => i !== idx));
  const updateAlloc = (idx: number, amt: number) => setAllocations(allocations.map((a, i) => i === idx ? { ...a, amount_applied: amt } : a));

  const total = allocations.reduce((s, a) => s + Number(a.amount_applied || 0), 0);

  const submit = async () => {
    if (allocations.length === 0) { toast({ title: "Add at least one invoice", variant: "destructive" }); return; }
    if (total <= 0) { toast({ title: "Total must be > 0", variant: "destructive" }); return; }

    const { data: settlement, error } = await apiClient.from("settlements")
      .insert({ ...form, total_amount: total, status: "completed" }).select().single();
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });

    const itemsToInsert = allocations.map(a => ({ settlement_id: settlement.id, ...a }));
    const { error: e2 } = await apiClient.from("settlement_items").insert(itemsToInsert);
    if (e2) return toast({ title: "Items failed", description: e2.message, variant: "destructive" });

    toast({ title: `Settlement ${settlement.settlement_no} recorded` });
    setOpen(false); setAllocations([]);
    setForm({ settlement_date: new Date().toISOString().slice(0, 10), payer_name: "", payment_method: "cash", wallet_account_id: null, notes: "" });
    load();
  };

  const removeSettlement = async (id: string, no: string) => {
    if (!confirm(`Delete ${no}? This will reverse the wallet credit.`)) return;
    const { error } = await apiClient.from("settlements").delete().eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Deleted" });
    load();
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settlements (Customer Payments)</h1>
          <p className="text-sm text-muted-foreground">Record customer payments — apply to one or many invoices (Ticket / Visa / Refund).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Settlement</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Settlement (STM-)</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date</Label><Input type="date" value={form.settlement_date} onChange={e => setForm({ ...form, settlement_date: e.target.value })} /></div>
              <div><Label>Payer Name</Label><Input value={form.payer_name} onChange={e => setForm({ ...form, payer_name: e.target.value })} /></div>
              <div>
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Wallet *</Label>
                <Select value={form.wallet_account_id || ""} onValueChange={v => setForm({ ...form, wallet_account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                  <SelectContent>
                    {wallets.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

              <div className="col-span-2">
                <Label>Apply to Invoice</Label>
                <Select value="" onValueChange={addAllocation}>
                  <SelectTrigger><SelectValue placeholder="Select an invoice with due..." /></SelectTrigger>
                  <SelectContent>
                    {sources.length === 0 && <div className="p-2 text-sm text-muted-foreground">No outstanding invoices.</div>}
                    {sources.map(s => <SelectItem key={`${s.source_type}:${s.id}`} value={`${s.source_type}:${s.id}`}>{s.label} — Due ৳{s.due.toLocaleString("en-IN")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {allocations.length > 0 && (
                <div className="col-span-2 border rounded-md p-3 space-y-2">
                  <div className="text-sm font-medium">Allocations:</div>
                  {allocations.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs font-mono w-32">{a.invoice_no}</span>
                      <Badge variant="outline" className="text-xs">{a.source_type}</Badge>
                      <Input type="number" value={a.amount_applied} onChange={e => updateAlloc(i, Number(e.target.value))} className="w-32" />
                      <Button size="icon" variant="ghost" onClick={() => removeAlloc(i)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t font-medium">
                    <span>Total:</span><span className="tabular-nums">৳{total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Record Settlement</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>All Settlements ({settlements.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>STM No</TableHead><TableHead>Date</TableHead><TableHead>Payer</TableHead>
              <TableHead>Method</TableHead><TableHead>Invoices</TableHead>
              <TableHead className="text-right">Amount</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {settlements.map(s => {
                const its = items.filter(i => i.settlement_id === s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.settlement_no}</TableCell>
                    <TableCell className="text-xs">{s.settlement_date}</TableCell>
                    <TableCell>{s.payer_name || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{s.payment_method}</Badge></TableCell>
                    <TableCell className="text-xs">{its.map(i => i.invoice_no).join(", ") || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">৳{Number(s.total_amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => removeSettlement(s.id, s.settlement_no)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                  </TableRow>
                );
              })}
              {settlements.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No settlements yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
