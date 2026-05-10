import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, ShieldCheck, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("rk_access_token")}`,
  "Content-Type": "application/json",
});

interface Approval {
  id: string; type: string; entity_type?: string; entity_id?: string;
  payload: any; reason?: string; status: string;
  requested_by_email?: string; reviewed_by_email?: string; review_note?: string;
  created_at: string; reviewed_at?: string;
}

const TYPE_LABELS: Record<string, string> = {
  refund: "Refund",
  payment_edit: "Payment Edit",
  visa_rejection: "Visa Rejection",
  booking_cancel: "Booking Cancellation",
  commission_payout: "Commission Payout",
};

export default function AdminApprovalsPage() {
  const [items, setItems] = useState<Approval[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Approval | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const url = tab === "all" ? `${API_URL}/rbac/approvals` : `${API_URL}/rbac/approvals?status=${tab}`;
      const r = await fetch(url, { headers: headers() }).then(r => r.json());
      setItems(r.approvals || []);
    } catch (e: any) { toast.error("Failed: " + e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const counts = useMemo(() => {
    const m: any = { pending: 0, approved: 0, rejected: 0 };
    items.forEach(i => { m[i.status] = (m[i.status] || 0) + 1; });
    return m;
  }, [items]);

  const submitDecision = async () => {
    if (!open) return;
    const res = await fetch(`${API_URL}/rbac/approvals/${open.id}/decision`, {
      method: "POST", headers: headers(),
      body: JSON.stringify({ decision, note }),
    });
    if (res.ok) {
      toast.success(`Marked ${decision}`);
      setOpen(null); setNote(""); load();
    } else toast.error("Failed");
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Approval Center</h1>
            <p className="text-sm text-muted-foreground">Review refunds, edits, cancellations & payouts</p>
          </div>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader><CardTitle className="text-base">Requests ({items.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No requests</TableCell></TableRow>
              )}
              {items.map(i => (
                <TableRow key={i.id}>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABELS[i.type] || i.type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    <div>{i.entity_type}</div>
                    <div className="text-muted-foreground truncate max-w-[140px]">{i.entity_id}</div>
                  </TableCell>
                  <TableCell className="text-sm">{i.requested_by_email || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[260px] truncate">{i.reason || "—"}</TableCell>
                  <TableCell>
                    {i.status === "pending" && <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}
                    {i.status === "approved" && <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>}
                    {i.status === "rejected" && <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(i.created_at), "dd MMM HH:mm")}</TableCell>
                  <TableCell className="text-right">
                    {i.status === "pending" ? (
                      <Button size="sm" onClick={() => { setOpen(i); setDecision("approved"); setNote(""); }}>Review</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setOpen(i)}>Details</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{open ? `${TYPE_LABELS[open.type] || open.type} Request` : ""}</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Entity:</span> {open.entity_type} / {open.entity_id || "—"}</div>
                <div><span className="text-muted-foreground">Requested by:</span> {open.requested_by_email || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {open.reason || "—"}</div>
              </div>
              {open.payload && Object.keys(open.payload).length > 0 && (
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">{JSON.stringify(open.payload, null, 2)}</pre>
              )}
              {open.status === "pending" ? (
                <>
                  <div className="flex gap-2">
                    <Button variant={decision === "approved" ? "default" : "outline"} size="sm" onClick={() => setDecision("approved")}>Approve</Button>
                    <Button variant={decision === "rejected" ? "destructive" : "outline"} size="sm" onClick={() => setDecision("rejected")}>Reject</Button>
                  </div>
                  <Textarea placeholder="Review note (optional)" value={note} onChange={e => setNote(e.target.value)} />
                </>
              ) : (
                <div className="text-sm">
                  <div><span className="text-muted-foreground">Reviewed by:</span> {open.reviewed_by_email || "—"}</div>
                  <div><span className="text-muted-foreground">Note:</span> {open.review_note || "—"}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {open?.status === "pending" && <Button onClick={submitDecision}>Submit decision</Button>}
            <Button variant="ghost" onClick={() => setOpen(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
