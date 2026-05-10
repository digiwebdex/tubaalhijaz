import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { useIsViewer } from "@/components/admin/AdminLayout";

const inputClass = "w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

const EMPTY = {
  name: "", meal_type: "lunch", cuisine: "Bangladeshi",
  price_per_meal: 0, min_persons: 1, description: "",
  image_url: "", is_active: true, show_on_website: true, display_order: 0,
};

export default function AdminCateringPage() {
  const isViewer = useIsViewer();
  const [tab, setTab] = useState<"packages" | "orders">("packages");
  const [packages, setPackages] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAll = async () => {
    const [p, o] = await Promise.all([
      apiClient.from("catering_packages").select("*").order("display_order"),
      apiClient.from("catering_orders").select("*").order("created_at", { ascending: false }),
    ]);
    setPackages(p.data || []);
    setOrders(o.data || []);
  };
  useEffect(() => { fetchAll(); }, []);

  const save = async () => {
    const payload = {
      ...form,
      price_per_meal: Number(form.price_per_meal) || 0,
      min_persons: Number(form.min_persons) || 1,
      display_order: Number(form.display_order) || 0,
    };
    const res = editingId
      ? await apiClient.from("catering_packages").update(payload).eq("id", editingId)
      : await apiClient.from("catering_packages").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    setShowForm(false); setForm(EMPTY); setEditingId(null);
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this catering package?")) return;
    const { error } = await apiClient.from("catering_packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); fetchAll();
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await apiClient.from("catering_orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated"); fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0F4C3A]">Catering <span className="text-base font-normal text-[#C9A96E]" dir="rtl" style={{ fontFamily: "'Noto Naskh Arabic',serif" }}>· خدمات التموين</span></h1>
          <p className="text-sm text-muted-foreground">Manage Iftar, Suhoor, Lunch & Dinner packages for Makkah & Madinah groups.</p>
        </div>
        {tab === "packages" && !isViewer && (
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Package
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border">
        {(["packages", "orders"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
            {t} {t === "orders" && orders.length > 0 && `(${orders.length})`}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editingId ? "Edit" : "New"} Catering Package</h3>
            <button onClick={() => setShowForm(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className={inputClass} placeholder="Package name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className={inputClass} value={form.meal_type} onChange={e => setForm({ ...form, meal_type: e.target.value })}>
              {["breakfast", "lunch", "dinner", "full_board"].map(v => <option key={v}>{v}</option>)}
            </select>
            <select className={inputClass} value={form.cuisine} onChange={e => setForm({ ...form, cuisine: e.target.value })}>
              {["Bangladeshi", "Arabic", "Mixed", "Indian"].map(v => <option key={v}>{v}</option>)}
            </select>
            <input className={inputClass} type="number" placeholder="Min persons" value={form.min_persons} onChange={e => setForm({ ...form, min_persons: e.target.value })} />
            <input className={inputClass} type="number" placeholder="Price per meal (SAR)" value={form.price_per_meal} onChange={e => setForm({ ...form, price_per_meal: e.target.value })} />
            <input className={inputClass} placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
            <textarea className={inputClass + " md:col-span-2"} rows={2} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.show_on_website} onChange={e => setForm({ ...form, show_on_website: e.target.checked })} /> Show on website</label>
          </div>
          <button onClick={save} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm flex items-center gap-2">
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      )}

      {tab === "packages" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Meal</th><th className="text-left p-3">Cuisine</th><th className="text-left p-3">Min Pax</th><th className="text-left p-3">Price/Meal</th><th className="text-left p-3">Active</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {packages.map(p => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 capitalize">{p.meal_type}</td>
                  <td className="p-3">{p.cuisine}</td>
                  <td className="p-3">{p.min_persons}</td>
                  <td className="p-3">SAR {p.price_per_meal}</td>
                  <td className="p-3">{p.is_active ? "✓" : "—"}</td>
                  <td className="p-3 text-right">
                    {!isViewer && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditingId(p.id); setForm({ ...EMPTY, ...p }); setShowForm(true); }} className="text-primary"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => remove(p.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {packages.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No catering packages yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "orders" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr><th className="text-left p-3">Customer</th><th className="text-left p-3">Persons</th><th className="text-left p-3">Days</th><th className="text-left p-3">Start</th><th className="text-left p-3">Total</th><th className="text-left p-3">Status</th></tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3">{o.guest_name}<br/><span className="text-xs text-muted-foreground">{o.guest_phone}</span></td>
                  <td className="p-3">{o.persons}</td>
                  <td className="p-3">{o.days}</td>
                  <td className="p-3">{o.start_date || "—"}</td>
                  <td className="p-3">{o.currency} {o.total_price}</td>
                  <td className="p-3">
                    <select disabled={isViewer} value={o.status || "pending"} onChange={e => updateOrderStatus(o.id, e.target.value)} className="bg-secondary border border-border rounded px-2 py-1 text-xs">
                      {["pending", "confirmed", "completed", "cancelled"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No catering orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
