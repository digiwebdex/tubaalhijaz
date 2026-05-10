import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, RefreshCw, Search, Eye, Download, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  method: string | null;
  path: string | null;
  status_code: number | null;
  ip_address: string | null;
  user_agent: string | null;
  changes: any;
  metadata: any;
  severity?: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  login: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
};

const SEVERITY_META: Record<string, { color: string; Icon: any }> = {
  info: { color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", Icon: Info },
  warning: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100", Icon: AlertTriangle },
  critical: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100", Icon: AlertCircle },
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const exportCsv = () => {
    const head = ["time","actor","role","action","severity","entity","entity_id","method","status","ip","path"];
    const rows = filtered.map(l => [
      l.created_at, l.actor_email||"", l.actor_role||"", l.action,
      l.severity||"info", l.entity_type||"", l.entity_id||"",
      l.method||"", l.status_code??"", l.ip_address||"", l.path||""
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
    const blob = new Blob([head.join(",")+"\n"+rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit-logs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await apiClient
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("লগ লোড করা যায়নি: " + error.message);
    else setLogs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const entities = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entity_type).filter(Boolean) as string[])).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
      if (severityFilter !== "all" && (l.severity || "info") !== severityFilter) return false;
      if (!q) return true;
      return (
        l.actor_email?.toLowerCase().includes(q) ||
        l.path?.toLowerCase().includes(q) ||
        l.entity_id?.toLowerCase().includes(q) ||
        l.ip_address?.toLowerCase().includes(q)
      );
    });
  }, [logs, search, actionFilter, entityFilter, severityFilter]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Audit Log Viewer</h1>
            <p className="text-sm text-muted-foreground">সব admin action-এর সম্পূর্ণ ট্র্যাকিং</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportCsv} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={fetchLogs} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="খুঁজুন: email, path, IP, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব Action</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="login">Login</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব Entity</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Logs ({filtered.length}{logs.length >= 500 ? " of latest 500" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={8} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">কোনো লগ পাওয়া যায়নি</TableCell></TableRow>
              )}
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {format(new Date(log.created_at), "dd MMM HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.actor_email || <span className="text-muted-foreground">guest</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={ACTION_COLORS[log.action] || "bg-muted"}>{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.entity_type}
                    {log.entity_id && (
                      <div className="text-xs text-muted-foreground font-mono">{log.entity_id.slice(0, 12)}...</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono max-w-[200px] truncate">{log.path}</TableCell>
                  <TableCell>
                    {log.status_code && (
                      <Badge variant={log.status_code >= 400 ? "destructive" : "secondary"}>
                        {log.status_code}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{log.ip_address}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => setSelected(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Time:</span> {format(new Date(selected.created_at), "dd MMM yyyy HH:mm:ss")}</div>
                <div><span className="text-muted-foreground">Action:</span> {selected.action}</div>
                <div><span className="text-muted-foreground">Actor:</span> {selected.actor_email || "—"}</div>
                <div><span className="text-muted-foreground">Role:</span> {selected.actor_role || "—"}</div>
                <div><span className="text-muted-foreground">Method:</span> {selected.method}</div>
                <div><span className="text-muted-foreground">Status:</span> {selected.status_code}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Path:</span> <code className="text-xs">{selected.path}</code></div>
                <div><span className="text-muted-foreground">Entity:</span> {selected.entity_type} / {selected.entity_id || "—"}</div>
                <div><span className="text-muted-foreground">IP:</span> {selected.ip_address}</div>
                <div className="col-span-2"><span className="text-muted-foreground">User Agent:</span> <span className="text-xs">{selected.user_agent}</span></div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Changes / Payload:</div>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(selected.changes, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
