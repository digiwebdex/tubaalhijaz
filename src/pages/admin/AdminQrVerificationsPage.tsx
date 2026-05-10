import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, ScanLine, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ScanLog {
  id: string;
  tracking_id: string | null;
  document_type: string | null;
  scan_result: string;
  ip_address: string | null;
  user_agent: string | null;
  scanned_at: string;
}
interface QrToken {
  id: string;
  token: string;
  document_type: string;
  tracking_id: string | null;
  status: string;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
}

export default function AdminQrVerificationsPage() {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [tokens, setTokens] = useState<QrToken[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: l }, { data: t }] = await Promise.all([
      apiClient.from("public_tracking_logs").select("*").order("scanned_at", { ascending: false }).limit(200),
      apiClient.from("qr_verifications").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setLogs((l as ScanLog[]) || []);
    setTokens((t as QrToken[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  const verifiedCount = logs.filter((x) => x.scan_result === "verified").length;
  const invalidCount = logs.filter((x) => x.scan_result !== "verified").length;
  const totalScans = tokens.reduce((s, t) => s + (t.scan_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold">QR Verification & Scan Logs</h1>
          <p className="text-sm text-muted-foreground">Public document verification activity (auto-refreshes every 30s)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<ScanLine className="h-5 w-5 text-blue-600" />} label="Recent scans" value={logs.length} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} label="Verified" value={verifiedCount} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-600" />} label="Invalid / Revoked" value={invalidCount} />
        <StatCard icon={<ShieldCheck className="h-5 w-5 text-amber-600" />} label="Total QR scans" value={totalScans} />
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Scan Activity</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="hidden md:table-cell">Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No scans yet.</TableCell></TableRow>
                ) : logs.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{new Date(row.scanned_at).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{row.tracking_id || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={row.scan_result === "verified" ? "default" : "destructive"}>
                        {row.scan_result}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{row.ip_address || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-xs">
                      {row.user_agent || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Issued QR Tokens</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scans</TableHead>
                <TableHead>Last Scan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No tokens yet.</TableCell></TableRow>
              ) : tokens.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.token.slice(0, 12)}…</TableCell>
                  <TableCell>{t.document_type}</TableCell>
                  <TableCell className="font-mono text-xs">{t.tracking_id || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status}</Badge>
                  </TableCell>
                  <TableCell>{t.scan_count}</TableCell>
                  <TableCell className="text-xs">{t.last_scanned_at ? new Date(t.last_scanned_at).toLocaleString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}<span>{label}</span></div>
        <p className="text-3xl font-bold mt-2 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
