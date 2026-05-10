import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Users, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "/api";
const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("rk_access_token")}`,
  "Content-Type": "application/json",
});

interface Role { key: string; label: string; user_count: number }
interface Perm { key: string; module: string; label: string; description?: string }
interface MatrixRow { role: string; permission_key: string; scope: string }

export default function AdminRolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<string>("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, p, m] = await Promise.all([
        fetch(`${API_URL}/rbac/roles`, { headers: headers() }).then(r => r.json()),
        fetch(`${API_URL}/rbac/permissions`, { headers: headers() }).then(r => r.json()),
        fetch(`${API_URL}/rbac/matrix`, { headers: headers() }).then(r => r.json()),
      ]);
      setRoles(r.roles || []);
      setPerms(p.permissions || []);
      setMatrix(m.matrix || []);
      if (!activeRole && r.roles?.[0]) setActiveRole(r.roles[0].key);
    } catch (e: any) {
      toast.error("Failed to load: " + e.message);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const grantedSet = useMemo(
    () => new Set(matrix.filter(m => m.role === activeRole).map(m => m.permission_key)),
    [matrix, activeRole]
  );

  const modules = useMemo(() => {
    const filtered = perms.filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return p.label.toLowerCase().includes(q) || p.module.toLowerCase().includes(q) || p.key.includes(q);
    });
    return filtered.reduce<Record<string, Perm[]>>((acc, p) => {
      (acc[p.module] = acc[p.module] || []).push(p);
      return acc;
    }, {});
  }, [perms, search]);

  const togglePerm = async (permKey: string, granted: boolean) => {
    setSaving(permKey);
    try {
      const res = await fetch(`${API_URL}/rbac/matrix`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ role: activeRole, permission_key: permKey, granted, scope: "all" }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMatrix(prev => granted
        ? [...prev.filter(m => !(m.role === activeRole && m.permission_key === permKey)), { role: activeRole, permission_key: permKey, scope: "all" }]
        : prev.filter(m => !(m.role === activeRole && m.permission_key === permKey))
      );
      toast.success("Updated");
    } catch (e: any) {
      toast.error("Save failed: " + e.message);
    }
    setSaving(null);
  };

  const isLocked = activeRole === "super_admin" || activeRole === "admin";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground">Enterprise RBAC — granular permission matrix</p>
          </div>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-[280px,1fr] gap-6">
        {/* Roles list */}
        <Card>
          <CardHeader><CardTitle className="text-base">Roles ({roles.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1 max-h-[70vh] overflow-y-auto">
            {roles.map(r => (
              <button
                key={r.key}
                onClick={() => setActiveRole(r.key)}
                className={`w-full text-left p-3 rounded-lg border transition flex items-center justify-between ${
                  activeRole === r.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                }`}
              >
                <div>
                  <div className="font-medium text-sm">{r.label}</div>
                  <div className="text-xs text-muted-foreground font-mono">{r.key}</div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />{r.user_count}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Permission matrix */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">
                Permissions for <span className="text-primary">{roles.find(r => r.key === activeRole)?.label || "—"}</span>
                {isLocked && <Badge className="ml-2" variant="destructive">Locked (full access)</Badge>}
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search permissions"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 max-h-[70vh] overflow-y-auto">
            {Object.entries(modules).map(([mod, list]) => (
              <div key={mod}>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{mod}</div>
                <div className="space-y-2">
                  {list.map(p => {
                    const granted = grantedSet.has(p.key);
                    return (
                      <div key={p.key} className="flex items-center justify-between p-3 rounded-md border bg-card">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{p.label}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.key}</div>
                          {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                        </div>
                        <Switch
                          checked={granted || isLocked}
                          disabled={isLocked || saving === p.key}
                          onCheckedChange={(v) => togglePerm(p.key, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
