import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, X, Edit2, Trash2, Save, ToggleLeft, ToggleRight, Upload, Loader2, Eye, Copy, ListChecks } from "lucide-react";
import { useIsViewer } from "@/components/admin/AdminLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AdminActionMenu from "@/components/admin/AdminActionMenu";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
const TYPES = ["hajj", "umrah", "tour", "visa", "air_ticket", "hotel", "transport", "ziyara"];

const EMPTY_FORM = {
  name: "", type: "umrah", description: "", price: "", duration_days: "",
  image_url: "", start_date: "", expiry_date: "", services: "", features: "",
  is_active: true, status: "active", show_on_website: true,
  rating: "4.9", highlight_tag: "",
};

export default function AdminPackagesPage() {
  const isViewer = useIsViewer();
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get("type");

  const [packages, setPackages] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "add";
  });
  const [form, setForm] = useState({ ...EMPTY_FORM, type: urlType && TYPES.includes(urlType) ? urlType : "umrah" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewPkg, setViewPkg] = useState<any>(null);

  const [typeFilter, setTypeFilter] = useState(urlType || "all");

  useEffect(() => {
    if (urlType) {
      setTypeFilter(urlType);
      setForm(f => ({ ...f, type: TYPES.includes(urlType) ? urlType : f.type }));
    } else {
      setTypeFilter("all");
    }
  }, [urlType]);

  const fetchPkgs = () => apiClient.from("packages").select("*").order("created_at", { ascending: false }).then(({ data }) => setPackages(data || []));
  useEffect(() => { fetchPkgs(); }, []);

  const filteredPackages = typeFilter === "all" ? packages : packages.filter(p => p.type === typeFilter);
  const availableTypes = [...new Set(packages.map(p => p.type))].sort();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file only"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File size must be under 5MB"); return; }
    setUploading(true);
    const path = `packages/${Date.now()}-${file.name}`;
    const { error } = await apiClient.storage.from("hotel-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: { publicUrl } } = apiClient.storage.from("hotel-images").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: publicUrl }));
    setUploading(false);
  };

  const parseFeatures = (text: string): string[] => {
    return text.split("\n").map(l => l.replace(/^[\s•\-\*►▸▹➤➜→]+/, "").trim()).filter(Boolean);
  };

  const buildPayload = (f: typeof form) => {
    const featuresList = parseFeatures(f.features);
    const servicesList = f.services ? f.services.split(",").map(s => s.trim()).filter(Boolean) : [];
    const ratingNum = parseFloat(f.rating);
    return {
      name: f.name.trim(), type: f.type, description: f.description.trim() || null,
      price: parseFloat(f.price), duration_days: f.duration_days ? parseInt(f.duration_days) : null,
      image_url: f.image_url || null, start_date: f.start_date || null,
      expiry_date: f.expiry_date || null,
      services: servicesList,
      features: featuresList,
      is_active: f.status === "active",
      status: f.status,
      show_on_website: f.show_on_website,
      rating: isNaN(ratingNum) ? 4.9 : Math.max(0, Math.min(5, ratingNum)),
      highlight_tag: f.highlight_tag.trim() || null,
    };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Package name is required"); return; }
    if (!form.price || parseFloat(form.price) <= 0) { toast.error("Please enter a valid price"); return; }
    const { error } = await apiClient.from("packages").insert(buildPayload(form));
    if (error) { toast.error(error.message); return; }
    toast.success("Package created");
    setShowForm(false); setForm({ ...EMPTY_FORM }); fetchPkgs();
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    const svc = Array.isArray(p.services) ? p.services.join(", ") : "";
    const feat = Array.isArray(p.features) ? p.features.join("\n") : "";
    setForm({
      name: p.name, type: p.type, description: p.description || "", price: String(p.price),
      duration_days: p.duration_days ? String(p.duration_days) : "", image_url: p.image_url || "",
      start_date: p.start_date || "", expiry_date: p.expiry_date || "",
      services: svc, features: feat,
      is_active: p.is_active,
      status: p.status || (p.is_active ? "active" : "inactive"),
      show_on_website: p.show_on_website !== false,
      rating: p.rating != null ? String(p.rating) : "4.9",
      highlight_tag: p.highlight_tag || "",
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const { error } = await apiClient.from("packages").update(buildPayload(form)).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Package updated");
    setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM }); fetchPkgs();
  };

  const toggleActive = async (p: any) => {
    const newStatus = p.status === "active" ? "inactive" : "active";
    const { error } = await apiClient.from("packages").update({ 
      status: newStatus, 
      is_active: newStatus === "active",
      show_on_website: newStatus === "inactive" ? false : p.show_on_website,
    } as any).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newStatus === "active" ? "Package activated" : "Package deactivated");
    fetchPkgs();
  };

  const handleDuplicate = async (p: any) => {
    const svc = Array.isArray(p.services) ? p.services : [];
    const feat = Array.isArray(p.features) ? p.features : [];
    const { error } = await apiClient.from("packages").insert({
      name: p.name + " (Copy)", type: p.type, description: p.description,
      price: p.price, duration_days: p.duration_days, image_url: p.image_url,
      start_date: p.start_date, expiry_date: p.expiry_date, services: svc, features: feat,
      is_active: false, status: "inactive", show_on_website: false,
      rating: p.rating ?? 4.9, highlight_tag: p.highlight_tag ?? null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Package duplicated");
    fetchPkgs();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await apiClient.from("packages").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Package deleted");
    setDeleteId(null); fetchPkgs();
  };

  const closeModal = () => { setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM, type: urlType && TYPES.includes(urlType) ? urlType : "umrah" }); };

  const TYPE_DISPLAY: Record<string, string> = {
    air_ticket: "Air Ticket", visa: "Visa", tour: "Tour", hajj: "Hajj",
    umrah: "Umrah", hotel: "Hotel", transport: "Transport", ziyara: "Ziyara",
  };
  const pageTitle = urlType && TYPE_DISPLAY[urlType] ? `${TYPE_DISPLAY[urlType]} Management` : "Package Management";

  const renderForm = () => (
    <form onSubmit={editingId ? handleSave : handleCreate} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">Package Name *</label>
          <input className={inputClass} placeholder="Package name" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={200} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Type *</label>
          <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Price (BDT) *</label>
          <input className={inputClass} placeholder="0" type="number" step="0.01" min="1" required value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Duration (Days)</label>
          <input className={inputClass} placeholder="Number of days" type="number" min="1" value={form.duration_days}
            onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Start Date</label>
          <input className={inputClass} type="date" value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">End Date</label>
          <input className={inputClass} type="date" value={form.expiry_date}
            onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Services (comma-separated)</label>
          <input className={inputClass} placeholder="Visa, Hotel, Transport, Food"
            value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Rating (0–5)</label>
          <input className={inputClass} type="number" step="0.1" min="0" max="5" placeholder="4.9"
            value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">
            Highlight Tag <span className="text-muted-foreground/70">(optional — short pill on card, e.g. এখনই, New, Popular)</span>
          </label>
          <input className={inputClass} placeholder="এখনই / New / Popular" maxLength={20}
            value={form.highlight_tag} onChange={(e) => setForm({ ...form, highlight_tag: e.target.value })} />
        </div>

        {/* Features / Bullet Points Editor */}
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-primary" />
            Features / Bullet Points (one per line)
          </label>
          <textarea
            className={`${inputClass} resize-none font-mono text-xs leading-relaxed`}
            placeholder={"► আরসা ম্ববাদ এয়ার টিকেট (ট্রানজিট ফ্লাইট)\n► ভিসা ও ট্রান্সপোর্ট\n► তিন বেলা দেশীয় খাবার পরিবেশন\n► মুফতি সাহেবের গাইডেন্স"}
            rows={6}
            value={form.features}
            onChange={(e) => setForm({ ...form, features: e.target.value })}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            প্রতিটি লাইন একটি বুলেট পয়েন্ট হিসেবে দেখাবে। ► বা • চিহ্ন দিতে পারেন অথবা শুধু লিখুন।
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">Description</label>
          <textarea className={`${inputClass} resize-none`} placeholder="Package details..." rows={3}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground block mb-1">
            Banner Image <span className="text-primary">(Recommended: 800×450px, 16:9 ratio)</span>
          </label>
          {form.image_url ? (
            <div className="relative w-full rounded-lg overflow-hidden border border-border" style={{ aspectRatio: "16/9" }}>
              <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setForm({ ...form, image_url: "" })}
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className={`${inputClass} flex items-center justify-center gap-2 cursor-pointer border-dashed`} style={{ aspectRatio: "16/5" }}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{uploading ? "Uploading..." : "Upload Image (800×450px recommended)"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          )}
        </div>
        <div className="sm:col-span-2 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">System Status:</label>
            <button type="button" onClick={() => setForm({ ...form, status: form.status === "active" ? "inactive" : "active", is_active: form.status !== "active" })}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md ${form.status === "active" ? "bg-emerald/10 text-emerald" : "bg-secondary text-muted-foreground"}`}>
              {form.status === "active" ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              {form.status === "active" ? "Active" : "Inactive"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Show on Website:</label>
            <button type="button" 
              onClick={() => form.status === "active" && setForm({ ...form, show_on_website: !form.show_on_website })}
              disabled={form.status !== "active"}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md ${
                form.status !== "active" ? "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed" :
                form.show_on_website ? "bg-blue-500/10 text-blue-600" : "bg-secondary text-muted-foreground"
              }`}>
              {form.show_on_website && form.status === "active" ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              {form.show_on_website && form.status === "active" ? "Yes" : "No"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={closeModal} className="text-sm px-4 py-2 rounded-md bg-secondary">Cancel</button>
        <button type="submit"
          className="text-sm px-4 py-2 rounded-md bg-gradient-gold text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-gold flex items-center gap-2">
          <Save className="h-4 w-4" /> {editingId ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-heading text-xl font-bold">{pageTitle}</h2>
        {!isViewer && (
          <button onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM, type: urlType && TYPES.includes(urlType) ? urlType : "umrah" }); setShowForm(true); }}
            className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity shadow-gold">
            <Plus className="h-4 w-4" /> {urlType ? `New ${TYPE_DISPLAY[urlType] || "Package"}` : "New Package"}
          </button>
        )}
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setTypeFilter("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
          All ({packages.length})
        </button>
        {availableTypes.map(tp => {
          const count = packages.filter(p => p.type === tp).length;
          return (
            <button key={tp} onClick={() => setTypeFilter(tp)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${typeFilter === tp ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {tp} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filteredPackages.map((p: any) => (
          <div key={p.id} className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setViewPkg(p)}>
            <div className="flex items-start gap-4">
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-lg object-cover border border-border flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{p.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${(p.status || (p.is_active ? 'active' : 'inactive')) === 'active' ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"}`}>
                    {(p.status || (p.is_active ? 'active' : 'inactive')) === 'active' ? "Active" : "Inactive"}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.show_on_website !== false ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {p.show_on_website !== false ? "Visible" : "Hidden"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {p.type} • {p.duration_days ? `${p.duration_days} days` : "—"}
                  {p.start_date && ` • Start: ${p.start_date}`}
                  {p.expiry_date && ` • End: ${p.expiry_date}`}
                </p>
                {/* Show feature count */}
                {Array.isArray(p.features) && p.features.length > 0 && (
                  <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
                    <ListChecks className="h-3 w-3" /> {p.features.length} bullet points
                  </p>
                )}
                {Array.isArray(p.services) && p.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.services.map((s: string, i: number) => (
                      <span key={i} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <p className="font-heading font-bold text-primary">BDT {Number(p.price).toLocaleString("en-IN")}</p>
                <AdminActionMenu
                  inlineCount={2}
                  actions={[
                    { label: "View", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => setViewPkg(p) },
                    { label: "Edit", icon: <Edit2 className="h-3.5 w-3.5" />, onClick: () => openEdit(p), variant: "warning", hidden: isViewer },
                    { label: "Delete", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setDeleteId(p.id), variant: "destructive", hidden: isViewer, separator: true },
                    { label: "Duplicate", icon: <Copy className="h-3.5 w-3.5" />, onClick: () => handleDuplicate(p), variant: "purple", hidden: isViewer },
                    { label: (p.status || (p.is_active ? 'active' : 'inactive')) === 'active' ? "Deactivate" : "Activate", icon: (p.status || (p.is_active ? 'active' : 'inactive')) === 'active' ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />, onClick: () => toggleActive(p), variant: (p.status || (p.is_active ? 'active' : 'inactive')) === 'active' ? "warning" : "success", hidden: isViewer },
                  ]}
                />
              </div>
            </div>
          </div>
        ))}
        {filteredPackages.length === 0 && <p className="text-center text-muted-foreground py-12">No packages found.</p>}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? "Edit Package" : "Create New Package"}</DialogTitle>
          </DialogHeader>
          {renderForm()}
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewPkg} onOpenChange={(o) => { if (!o) setViewPkg(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{viewPkg?.name}</DialogTitle>
          </DialogHeader>
          {viewPkg && (
            <div className="space-y-3 text-sm">
              {viewPkg.image_url && (
                <div className="rounded-lg overflow-hidden border border-border" style={{ aspectRatio: "16/9" }}>
                  <img src={viewPkg.image_url} alt={viewPkg.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground text-xs block">Type</span><span className="font-medium capitalize">{viewPkg.type}</span></div>
                <div><span className="text-muted-foreground text-xs block">Price</span><span className="font-medium text-primary">BDT {Number(viewPkg.price).toLocaleString("en-IN")}</span></div>
                <div><span className="text-muted-foreground text-xs block">Duration</span><span className="font-medium">{viewPkg.duration_days ? `${viewPkg.duration_days} days` : "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">End Date</span><span className="font-medium">{viewPkg.expiry_date || "—"}</span></div>
                <div><span className="text-muted-foreground text-xs block">System Status</span><span className={`font-medium ${(viewPkg.status || (viewPkg.is_active ? 'active' : 'inactive')) === 'active' ? "text-emerald" : "text-destructive"}`}>{(viewPkg.status || (viewPkg.is_active ? 'active' : 'inactive')) === 'active' ? "Active" : "Inactive"}</span></div>
                <div><span className="text-muted-foreground text-xs block">Website</span><span className={`font-medium ${viewPkg.show_on_website !== false ? "text-blue-600" : "text-amber-600"}`}>{viewPkg.show_on_website !== false ? "Visible" : "Hidden"}</span></div>
              </div>
              {viewPkg.description && <div><span className="text-muted-foreground text-xs block">Description</span><p>{viewPkg.description}</p></div>}
              {Array.isArray(viewPkg.features) && viewPkg.features.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs block mb-1.5">Features / Bullet Points</span>
                  <ul className="space-y-1.5 bg-secondary/50 rounded-lg p-3">
                    {viewPkg.features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-bold mt-0.5">►</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(viewPkg.services) && viewPkg.services.length > 0 && (
                <div><span className="text-muted-foreground text-xs block mb-1">Services</span>
                  <div className="flex flex-wrap gap-1">{viewPkg.services.map((s: string, i: number) => <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded">{s}</span>)}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-bold text-lg mb-2">Delete Package?</h3>
            <p className="text-sm text-muted-foreground mb-4">Existing bookings using this package will not be affected.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="text-sm px-4 py-2 rounded-md bg-secondary">Cancel</button>
              <button onClick={confirmDelete} className="text-sm px-4 py-2 rounded-md bg-destructive text-destructive-foreground">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
