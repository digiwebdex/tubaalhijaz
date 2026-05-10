import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Truck, MapPin, ScanLine, LogOut, Bell } from "lucide-react";

export default function DriverLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    apiClient.auth.getUser().then((r: any) => {
      const u = r?.data?.user || r?.user || null;
      if (!u) navigate("/auth");
      setUser(u);
    });
  }, [navigate]);

  // Background GPS ping every 25s when tracking is on
  useEffect(() => {
    if (!tracking) return;
    const send = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          await apiClient.request("/ops/tracking/ping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude, lng: pos.coords.longitude,
              speed_kmh: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null,
              heading: pos.coords.heading || null,
              status: "on_route",
              driver_name: user?.full_name || user?.email,
            }),
          });
        } catch (_) {}
      }, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 });
    };
    send();
    const id = window.setInterval(send, 25000);
    return () => clearInterval(id);
  }, [tracking, user]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-amber-500/30 p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-400/80">Tuba Al Hijaz</div>
          <div className="font-bold text-lg">Driver Portal</div>
        </div>
        <button
          onClick={() => setTracking(t => !t)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold ${tracking ? "bg-emerald-500 text-white animate-pulse" : "bg-slate-700 text-slate-300"}`}
        >
          {tracking ? "● LIVE" : "● OFFLINE"}
        </button>
      </header>

      <main className="flex-1 p-4 pb-24"><Outlet /></main>

      <nav className="fixed bottom-0 inset-x-0 bg-slate-900/95 border-t border-amber-500/30 backdrop-blur grid grid-cols-4 text-center text-xs">
        {[
          { to: "/driver", label: "Trips", icon: Truck, end: true },
          { to: "/driver/scan", label: "Scan QR", icon: ScanLine },
          { to: "/driver/alerts", label: "Alerts", icon: Bell },
          { to: "/driver/profile", label: "Profile", icon: MapPin },
        ].map(item => (
          <NavLink key={item.to} to={item.to} end={item.end as any}
            className={({ isActive }) =>
              `py-3 flex flex-col items-center gap-1 ${isActive ? "text-amber-400" : "text-slate-400"}`}
          >
            <item.icon className="h-5 w-5" />{item.label}
          </NavLink>
        ))}
        <button onClick={async () => { await apiClient.auth.signOut(); navigate("/auth"); }}
          className="absolute top-3 right-3 text-slate-500"><LogOut className="h-4 w-4" /></button>
      </nav>
    </div>
  );
}
