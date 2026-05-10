import { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Wallet, CreditCard, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { exportPDF, exportExcel } from "@/lib/reportExport";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { formatBDT } from "@/lib/utils";

const PAYMENT_METHODS = ["cash", "bkash", "nagad", "bank", "other"];

interface Props {
  supplierId: string;
  supplierName: string;
  contracts: any[];
  contractPayments: any[];
  accounts: any[];
  isViewer: boolean;
  onRefresh: () => void;
}

export default function SupplierContractManager({
  supplierId, supplierName, contracts, contractPayments, accounts, isViewer, onRefresh,
}: Props) {
  const { toast } = useToast();
  const [showContractForm, setShowContractForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [loading, setLoading] = useState(false);

  const [contractForm, setContractForm] = useState({ pilgrim_count: "", contract_amount: "" });
  const [paymentForm, setPaymentForm] = useState({
    amount: "", payment_method: "cash", payment_date: new Date().toISOString().split("T")[0],
    note: "", wallet_account_id: "",
  });

  const walletAccounts = accounts.filter(a =>
    ["asset", "wallet"].includes(a.type) || ["Cash", "bKash", "Nagad", "Bank"].includes(a.name)
  );

  const totalContractAmount = contracts.reduce((s, c) => s + Number(c.contract_amount || 0), 0);
  const totalContractPaid = contracts.reduce((s, c) => s + Number(c.total_paid || 0), 0);
  const totalContractDue = contracts.reduce((s, c) => s + Number(c.total_due || 0), 0);

  const handleCreateContract = async () => {
    const pilgrimCount = parseInt(contractForm.pilgrim_count);
    const contractAmount = parseFloat(contractForm.contract_amount);
    if (!pilgrimCount || pilgrimCount <= 0) { toast({ title: "Enter pilgrim count", variant: "destructive" }); return; }
    if (!contractAmount || contractAmount <= 0) { toast({ title: "Enter contract amount", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { error } = await apiClient.from("supplier_contracts").insert({
        supplier_id: supplierId, pilgrim_count: pilgrimCount,
        contract_amount: contractAmount, total_paid: 0, total_due: contractAmount,
      });
      if (error) throw error;
      toast({ title: "Contract created" });
      setShowContractForm(false);
      setContractForm({ pilgrim_count: "", contract_amount: "" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (!selectedContractId) { toast({ title: "Select a contract", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data: { session } } = await apiClient.auth.getSession();
      if (!session) return;
      const { error } = await apiClient.from("supplier_contract_payments").insert({
        supplier_id: supplierId, contract_id: selectedContractId, amount,
        payment_method: paymentForm.payment_method, payment_date: paymentForm.payment_date,
        note: paymentForm.note.trim() || null, wallet_account_id: paymentForm.wallet_account_id || null,
        created_by: session.user.id,
      });
      if (error) throw error;
      toast({ title: "Payment recorded" });
      setShowPaymentForm(false);
      setPaymentForm({ amount: "", payment_method: "cash", payment_date: new Date().toISOString().split("T")[0], note: "", wallet_account_id: "" });
      setSelectedContractId("");
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center">
          <CreditCard className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{formatBDT(totalContractAmount)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Contract Amount</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <Wallet className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-500">{formatBDT(totalContractPaid)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Paid</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center">
          <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-destructive">{formatBDT(totalContractDue)}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Due</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Contracts ({contracts.length})
          </CardTitle>
          <div className="flex gap-2">
            {!isViewer && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowPaymentForm(true)} disabled={contracts.length === 0}>
                  <Plus className="h-4 w-4 mr-1" /> Payment
                </Button>
                <Button size="sm" onClick={() => setShowContractForm(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Contract
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No contracts yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">Pilgrims</th>
                  <th className="pb-2 pr-3">Contract Amount</th>
                  <th className="pb-2 pr-3">Paid</th>
                  <th className="pb-2 pr-3">Due</th>
                  <th className="pb-2">Status</th>
                </tr></thead>
                <tbody>
                  {contracts.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 text-xs">{format(new Date(c.created_at), "dd MMM yyyy")}</td>
                      <td className="py-2 pr-3 font-medium">{c.pilgrim_count}</td>
                      <td className="py-2 pr-3 font-bold">{formatBDT(c.contract_amount)}</td>
                      <td className="py-2 pr-3 text-emerald-500 font-medium">{formatBDT(c.total_paid)}</td>
                      <td className="py-2 pr-3 text-destructive font-medium">{formatBDT(c.total_due)}</td>
                      <td className="py-2">
                        <Badge variant={Number(c.total_due) <= 0 ? "default" : "secondary"} className="text-[10px]">
                          {Number(c.total_due) <= 0 ? "Paid" : "Outstanding"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> Contract Payment History ({contractPayments.length})
          </CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => {
              exportPDF({ title: `${supplierName} — Contract Payments`, columns: ["Date", "Amount", "Method", "Note"],
                rows: contractPayments.map(p => [format(new Date(p.payment_date), "dd MMM yyyy"), Number(p.amount), p.payment_method || "cash", p.note || "—"]) });
            }}><FileDown className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => {
              exportExcel({ title: `${supplierName} — Contract Payments`, columns: ["Date", "Amount", "Method", "Note"],
                rows: contractPayments.map(p => [format(new Date(p.payment_date), "dd MMM yyyy"), Number(p.amount), p.payment_method || "cash", p.note || "—"]) });
            }}><FileSpreadsheet className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {contractPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground text-xs">
                  <th className="pb-2 pr-3">Date</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Method</th>
                  <th className="pb-2">Notes</th>
                </tr></thead>
                <tbody>
                  {contractPayments.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/30">
                      <td className="py-2 pr-3 text-xs">{format(new Date(p.payment_date), "dd MMM yyyy")}</td>
                      <td className="py-2 pr-3 font-bold text-emerald-500">{formatBDT(p.amount)}</td>
                      <td className="py-2 pr-3 capitalize">{p.payment_method}</td>
                      <td className="py-2 text-xs text-muted-foreground">{p.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showContractForm} onOpenChange={setShowContractForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Contract</DialogTitle><DialogDescription>Enter supplier contract details</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Pilgrim Count *</label>
              <Input type="number" min={1} value={contractForm.pilgrim_count} onChange={e => setContractForm({ ...contractForm, pilgrim_count: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Contract Amount (BDT) *</label>
              <Input type="number" min={0} value={contractForm.contract_amount} onChange={e => setContractForm({ ...contractForm, contract_amount: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContractForm(false)}>Cancel</Button>
            <Button onClick={handleCreateContract} disabled={loading}>{loading ? "Saving..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Contract Payment</DialogTitle><DialogDescription>Enter payment details</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Select Contract *</label>
              <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                <SelectTrigger><SelectValue placeholder="-- Contract --" /></SelectTrigger>
                <SelectContent>
                  {contracts.filter(c => Number(c.total_due) > 0).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {format(new Date(c.created_at), "dd MMM yyyy")} — {c.pilgrim_count} pilgrims — Due: {formatBDT(c.total_due)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Amount (BDT) *</label>
              <Input type="number" min={0} value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Method</label>
              <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm({ ...paymentForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Date</label>
              <Input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <Input value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} placeholder="Notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}