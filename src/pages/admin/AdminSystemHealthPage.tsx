import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, Database, HardDrive, Clock, RefreshCw } from "lucide-react";

type HealthLive = {
  status: string;
  uptime_seconds: number;
  timestamp: string;
  version?: string;
};

type HealthReady = {
  status: string;
  uptime_seconds: number;
  checks: Record<string, string>;
  timestamp: string;
};

const apiBase = (import.meta.env.VITE_API_URL as string) || "/api";

function formatUptime(s: number) {
  if (!s) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(" ");
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        ok ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
      }`}
    >
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}

export default function AdminSystemHealthPage() {
  const [live, setLive] = useState<HealthLive | null>(null);
  const [ready, setReady] = useState<HealthReady | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const [a, b] = await Promise.all([
        fetch(`${apiBase}/health`).then((r) => r.json()),
        fetch(`${apiBase}/health/ready`).then((r) => r.json()),
      ]);
      setLive(a);
      setReady(b);
      setLatencyMs(Math.round(performance.now() - start));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load health");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, []);

  const dbOk = ready?.checks?.database?.startsWith("ok") ?? false;
  const uploadsOk = ready?.checks?.uploads === "ok";
  const apiOk = live?.status === "ok";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            System Health & Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live status of API, database, and storage. Auto-refreshes every 15 seconds.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm hover:bg-muted/50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-md p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">API Server</span>
            <StatusPill ok={apiOk} label={apiOk ? "Healthy" : "Down"} />
          </div>
          <div className="text-2xl font-semibold text-foreground tabular-nums">
            {latencyMs !== null ? `${latencyMs} ms` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Round-trip latency</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> Database
            </span>
            <StatusPill ok={dbOk} label={dbOk ? "Connected" : "Unavailable"} />
          </div>
          <div className="text-sm text-foreground tabular-nums">{ready?.checks?.database || "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">PostgreSQL connectivity check</div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" /> Storage
            </span>
            <StatusPill ok={uploadsOk} label={uploadsOk ? "Mounted" : "Missing"} />
          </div>
          <div className="text-sm text-foreground">{ready?.checks?.uploads || "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">Uploads directory accessible</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Runtime
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Uptime</dt>
            <dd className="mt-1 font-medium text-foreground tabular-nums">{formatUptime(live?.uptime_seconds || 0)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Version</dt>
            <dd className="mt-1 font-medium text-foreground">{live?.version || "1.0.0"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Last Check</dt>
            <dd className="mt-1 font-medium text-foreground tabular-nums">
              {live ? new Date(live.timestamp).toLocaleTimeString() : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <StatusPill
                ok={apiOk && dbOk}
                label={apiOk && dbOk ? "All Systems Operational" : "Degraded"}
              />
            </dd>
          </div>
        </dl>
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: Endpoints <code className="bg-muted px-1 py-0.5 rounded">/api/health</code> (liveness) and{" "}
        <code className="bg-muted px-1 py-0.5 rounded">/api/health/ready</code> (readiness) are exposed for
        external uptime monitoring (UptimeRobot, Pingdom, Grafana, etc.).
      </div>
    </div>
  );
}
