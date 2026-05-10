import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";

export default function DriverProfilePage() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    apiClient.auth.getUser().then((r: any) => setUser(r?.data?.user || r?.user || null));
  }, []);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Profile</h1>
      <div className="rounded-xl border border-amber-500/20 bg-slate-900 p-4 space-y-1 text-sm">
        <div><span className="text-slate-400">Name:</span> {user?.full_name || "—"}</div>
        <div><span className="text-slate-400">Email:</span> {user?.email || "—"}</div>
        <div><span className="text-slate-400">Phone:</span> {user?.phone || "—"}</div>
      </div>
      <p className="text-xs text-slate-500">
        Tap the LIVE indicator at the top to start broadcasting your GPS to the operations command center.
      </p>
    </div>
  );
}
