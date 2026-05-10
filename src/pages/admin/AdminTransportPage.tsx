import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { useIsViewer } from "@/components/admin/AdminLayout";

const inputClass = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

const EMPTY = {
  vehicle_type: "Sedan", route_from: "", route_to: "",
  capacity: 4, price_bdt: 0, price_sar: 0, image_url: "",
  description: "", is_active: true, show_on_website: true, display_order: 0,
};

export default function AdminTransportPage() {
  const isViewer = useIsViewer();
  const [tab, setTab] = useState<"services" | "bookings">("services");
  const [services, setServices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAll = async () => {
    const [s, b] = await Promise.all([
      apiClient.from("transport_services").select("*").order("display_order"),
      apiClient.from("transport_bookings").select("*").order("created_at", { ascending: false }),
    ]);
    setServices(s.data || []);
    setBookings(b.data || []);
  };
  useEffect(() => { fetchAll(); }, []);

  const save = async () => {
    const payload = {
      ...form,
      capacity: Number(form.capacity) || 1,
      price_bdt: Number(form.price_bdt) || 0,
      price_sar: Number(form.price_sar) || 0,
      display_order: Number(form.display_order) || 0,
    };
    const res = editingId
      ? await apiClient.from("transport_services").update(payload).eq("id", editingId)
      : await apiClient.from("transport_services").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    setShowForm(false); setForm(EMPTY); setEditingId(null);
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this transport service?")) return;
    const { error } = await apiClient.from("transport_services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); fetchAll();
  };

  const updateBookingStatus = async (id: string, status: string) => {
    const { error } = await apiClient.from("transport_bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated"); fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Transport</h1>
          <p className="text-sm text-muted-foreground">Manage transport services and customer bookings</p>
        </div>
        {tab === "services" && !isViewer && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Service
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border">
        {(["services", "bookings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
            {t} {t === "bookings" && bookings.length > 0 && `(${bookings.length})`}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editingId ? "Edit" : "New"} Transport Service</h3>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select className={inputClass} value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })}>
              {["Sedan", "SUV", "Hiace", "Coaster", "Bus"].map(v => <option key={v}>{v}</option>)}
            </select>
            <input className={inputClass} type="number" placeholder="Capacity" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            <input className={inputClass} placeholder="Route from" value={form.route_from} onChange={e => setForm({ ...form, route_from: e.target.value })} />
            <input className={inputClass} placeholder="Route to" value={form.route_to} onChange={e => setForm({ ...form, route_to: e.target.value })} />
            <input className={inputClass} type="number" placeholder="Price (SAR)" value={form.price_sar} onChange={e => setForm({ ...form, price_sar: e.target.value })} />
            <input className={inputClass} type="number" placeholder="Price (BDT)" value={form.price_bdt} onChange={e => setForm({ ...form, price_bdt: e.target.value })} />
            <input className={inputClass + " md:col-span-2"} placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
            <textarea className={inputClass + " md:col-span-2"} rows={2} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.show_on_website} onChange={e => setForm({ ...form, show_on_website: e.target.checked })} /> Show on website</label>
          </div>
          <button onClick={save} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm flex items-center gap-2">
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      )}

      {tab === "services" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr><th className="text-left p-3">Vehicle</th><th className="text-left p-3">Route</th><th className="text-left p-3">Capacity</th><th className="text-left p-3">Price</th><th className="text-left p-3">Active</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3 font-medium">{s.vehicle_type}</td>
                  <td className="p-3 text-muted-foreground">{s.route_from} → {s.route_to}</td>
                  <td className="p-3">{s.capacity}</td>
                  <td className="p-3">SAR {s.price_sar} / BDT {s.price_bdt}</td>
                  <td className="p-3">{s.is_active ? "✓" : "—"}</td>
                  <td className="p-3 text-right">
                    {!isViewer && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditingId(s.id); setForm({ ...EMPTY, ...s }); setShowForm(true); }} className="text-primary"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => remove(s.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {services.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No transport services yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "bookings" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr><th className="text-left p-3">Customer</th><th className="text-left p-3">Vehicle</th><th className="text-left p-3">Route</th><th className="text-left p-3">Pickup</th><th className="text-left p-3">Pax</th><th className="text-left p-3">Total</th><th className="text-left p-3">Status</th></tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="border-t border-border">
                  <td className="p-3">{b.guest_name}<br/><span className="text-xs text-muted-foreground">{b.guest_phone}</span></td>
                  <td className="p-3">{b.vehicle_type}</td>
                  <td className="p-3 text-muted-foreground">{b.pickup_location} → {b.dropoff_location}</td>
                  <td className="p-3">{b.pickup_datetime ? new Date(b.pickup_datetime).toLocaleString() : "—"}</td>
                  <td className="p-3">{b.passengers}</td>
                  <td className="p-3">{b.currency} {b.total_price}</td>
                  <td className="p-3">
                    <select disabled={isViewer} value={b.status} onChange={e => updateBookingStatus(b.id, e.target.value)} className="bg-secondary border border-border rounded px-2 py-1 text-xs">
                      {["pending", "confirmed", "completed", "cancelled"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No transport bookings yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
