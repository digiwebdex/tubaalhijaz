import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Monitor, Smartphone, RefreshCw, LogOut, Shield } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("rk_access_token")}`,
  "Content-Type": "application/json",
});

interface Session {
  id: string; user_id: string; email?: string; full_name?: string;
  created_at: string; last_seen_at?: string; expires_at: string;
  ip_address?: string; user_agent?: string; device_label?: string;
}

const isMobile = (ua: string = "") => /Android|iPhone|iPad|Mobile/i.test(ua);

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/rbac/sessions`, { headers: headers() }).then(r => r.json());
      setSessions(r.sessions || []);
    } catch (e: any) { toast.error("Failed: " + e.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const revoke = async (id: string) => {
    if (!confirm("Force logout this session?")) return;
    const r = await fetch(`${API_URL}/rbac/sessions/${id}/revoke`, { method: "POST", headers: headers() });
    if (r.ok) { toast.success("Session revoked"); load(); }
    else toast.error("Revoke failed");
  };

  const revokeAll = async (userId: string, email?: string) => {
    if (!confirm(`Force logout ALL sessions for ${email || userId}?`)) return;
    const r = await fetch(`${API_URL}/rbac/sessions/revoke-user/${userId}`, { method: "POST", headers: headers() });
    if (r.ok) { toast.success("All sessions revoked"); load(); }
    else toast.error("Revoke failed");
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Active Sessions</h1>
            <p className="text-sm text-muted-foreground">Live device tracking and forced logout</p>
          </div>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Active sessions ({sessions.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>}
              {!loading && sessions.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No active sessions</TableCell></TableRow>
              )}
              {sessions.map(s => {
                const Mob = isMobile(s.user_agent);
                const Icon = Mob ? Smartphone : Monitor;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{s.full_name || s.email || "—"}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-xs">{Mob ? "Mobile" : "Desktop"}</div>
                          <div className="text-xs text-muted-foreground max-w-[200px] truncate">{s.user_agent}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.ip_address || "—"}</TableCell>
                    <TableCell className="text-xs">{format(new Date(s.created_at), "dd MMM HH:mm")}</TableCell>
                    <TableCell className="text-xs">{s.last_seen_at ? format(new Date(s.last_seen_at), "dd MMM HH:mm") : "—"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => revoke(s.id)}>
                        <LogOut className="h-3.5 w-3.5 mr-1" /> Revoke
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => revokeAll(s.user_id, s.email)}>
                        Revoke all
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
