import { useEffect, useState } from "react";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import {
  LayoutDashboard, Package, Users, CreditCard, Settings, LogOut, Plus, X, AlertTriangle, FileText, FolderOpen, Building2, Pencil,
} from "lucide-react";
import logo from "@/assets/logo.png";
import AdminDashboardCharts from "@/components/AdminDashboardCharts";
import AdminDocumentViewer from "@/components/AdminDocumentViewer";
import AdminHotelManager from "@/components/AdminHotelManager";
import AdminCmsEditor from "@/components/AdminCmsEditor";

const AdminPanel = () => {
  useSessionTimeout();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Data states
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [pkgForm, setPkgForm] = useState({ name: "", type: "umrah", description: "", price: "", duration_days: "", image_url: "" });
  const [planForm, setPlanForm] = useState({ name: "", num_installments: "3", description: "" });

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await apiClient.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data } = await apiClient.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!data) { toast.error("Access denied"); navigate("/dashboard"); return; }
      setIsAdmin(true);
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    const [bk, py, pk, ip, ht] = await Promise.all([
      apiClient.from("bookings").select("*, packages(name, type)").order("created_at", { ascending: false }),
      apiClient.from("payments").select("*, bookings(tracking_id)").order("created_at", { ascending: false }),
      apiClient.from("packages").select("*").order("created_at", { ascending: false }),
      apiClient.from("installment_plans").select("*").order("created_at", { ascending: false }),
      apiClient.from("hotels").select("*").order("created_at", { ascending: false }),
    ]);
    setBookings(bk.data || []);
    setPayments(py.data || []);
    setPackages(pk.data || []);
    setInstallmentPlans(ip.data || []);
    setHotels(ht.data || []);
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await apiClient.from("packages").insert({
      name: pkgForm.name,
      type: pkgForm.type,
      description: pkgForm.description,
      price: parseFloat(pkgForm.price),
      duration_days: pkgForm.duration_days ? parseInt(pkgForm.duration_days) : null,
      image_url: pkgForm.image_url || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Package created");
    setShowPackageForm(false);
    setPkgForm({ name: "", type: "umrah", description: "", price: "", duration_days: "", image_url: "" });
    fetchAll();
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await apiClient.from("installment_plans").insert({
      name: planForm.name,
      num_installments: parseInt(planForm.num_installments),
      description: planForm.description || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Installment plan created");
    setShowPlanForm(false);
    setPlanForm({ name: "", num_installments: "3", description: "" });
    fetchAll();
  };

  const markPaymentCompleted = async (paymentId: string) => {
    const { error } = await apiClient.from("payments").update({ status: "completed", paid_at: new Date().toISOString() }).eq("id", paymentId);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment marked as completed");
    fetchAll();
  };

  const totalRevenue = payments.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const totalDue = bookings.reduce((s, b) => s + Number(b.due_amount || 0), 0);
  const overduePayments = payments.filter((p) => p.status === "pending" && p.due_date && new Date(p.due_date) < new Date());

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "cms", label: "CMS", icon: Pencil },
    { key: "packages", label: "Packages", icon: Package },
    { key: "hotels", label: "Hotels", icon: Building2 },
    { key: "bookings", label: "Bookings", icon: FileText },
    { key: "payments", label: "Payments", icon: CreditCard },
    { key: "documents", label: "Documents", icon: FolderOpen },
    { key: "plans", label: "Installment Plans", icon: Settings },
  ];

  const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-md object-cover" />
            <span className="font-heading text-lg font-bold text-primary">Admin Panel</span>
          </div>
          <button onClick={async () => { await apiClient.auth.signOut(); navigate("/"); }} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <AdminDashboardCharts
            bookings={bookings}
            payments={payments}
            onMarkPaid={markPaymentCompleted}
          />
        )}

        {/* CMS */}
        {activeTab === "cms" && <AdminCmsEditor />}

        {/* Packages */}
        {activeTab === "packages" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-lg font-bold">Packages</h3>
              <button onClick={() => setShowPackageForm(!showPackageForm)} className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2">
                {showPackageForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showPackageForm ? "Cancel" : "Add Package"}
              </button>
            </div>
            {showPackageForm && (
              <form onSubmit={handleCreatePackage} className="bg-card border border-border rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input className={inputClass} placeholder="Package Name" required value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} />
                <select className={inputClass} value={pkgForm.type} onChange={(e) => setPkgForm({ ...pkgForm, type: e.target.value })}>
                  {["hajj", "umrah", "visa", "hotel", "transport", "ziyara"].map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <input className={inputClass} placeholder="Price (BDT)" type="number" required value={pkgForm.price} onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })} />
                <input className={inputClass} placeholder="Duration (days)" type="number" value={pkgForm.duration_days} onChange={(e) => setPkgForm({ ...pkgForm, duration_days: e.target.value })} />
                <textarea className={`${inputClass} sm:col-span-2`} placeholder="Description" rows={2} value={pkgForm.description} onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })} />
                <button type="submit" className="bg-gradient-gold text-primary-foreground font-semibold py-2.5 rounded-md text-sm sm:col-span-2">Create Package</button>
              </form>
            )}
            <div className="space-y-3">
              {packages.map((p: any) => (
                <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.type} • {p.duration_days} days • {p.is_active ? "Active" : "Inactive"}</p>
                  </div>
                  <p className="font-heading font-bold text-primary">৳{Number(p.price).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotels */}
        {activeTab === "hotels" && (
          <AdminHotelManager hotels={hotels} onRefresh={fetchAll} />
        )}

        {/* Bookings */}
        {activeTab === "bookings" && (
          <div className="space-y-3">
            <h3 className="font-heading text-lg font-bold mb-4">All Bookings</h3>
            {bookings.map((b: any) => (
              <div key={b.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-mono font-bold text-primary text-sm">{b.tracking_id}</p>
                    <p className="text-sm text-muted-foreground">{b.profiles?.full_name || "Unknown"} • {b.packages?.name || "N/A"}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${b.status === "completed" ? "text-emerald bg-emerald/10" : b.status === "cancelled" ? "text-destructive bg-destructive/10" : "text-primary bg-primary/10"}`}>
                    {b.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-muted-foreground">Total</p><p className="font-medium">৳{Number(b.total_amount).toLocaleString("en-IN")}</p></div>
                  <div><p className="text-muted-foreground">Paid</p><p className="font-medium">৳{Number(b.paid_amount).toLocaleString("en-IN")}</p></div>
                  <div><p className="text-muted-foreground">Due</p><p className="font-medium text-destructive">৳{Number(b.due_amount || 0).toLocaleString("en-IN")}</p></div>
                </div>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-center text-muted-foreground py-12">No bookings yet.</p>}
          </div>
        )}

        {/* Payments */}
        {activeTab === "payments" && (
          <div>
            <h3 className="font-heading text-lg font-bold mb-4">All Payments</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4">Booking</th>
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Due Date</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-mono text-xs">{p.bookings?.tracking_id || p.booking_id.slice(0, 8)}</td>
                      <td className="py-3 pr-4">{p.installment_number || "—"}</td>
                      <td className="py-3 pr-4 font-medium">৳{Number(p.amount).toLocaleString("en-IN")}</td>
                      <td className="py-3 pr-4">{p.due_date ? new Date(p.due_date).toLocaleDateString() : "—"}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${p.status === "completed" ? "text-emerald bg-emerald/10" : p.status === "pending" ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {p.status === "pending" && (
                          <button onClick={() => markPaymentCompleted(p.id)} className="text-xs text-primary hover:underline">Mark Paid</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {payments.length === 0 && <p className="text-center text-muted-foreground py-12">No payments yet.</p>}
          </div>
        )}

        {/* Documents */}
        {activeTab === "documents" && (
          <div>
            <h3 className="font-heading text-lg font-bold mb-4">Customer Documents</h3>
            <AdminDocumentViewer bookings={bookings} />
          </div>
        )}

        {/* Installment Plans */}
        {activeTab === "plans" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-lg font-bold">Installment Plans</h3>
              <button onClick={() => setShowPlanForm(!showPlanForm)} className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2">
                {showPlanForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showPlanForm ? "Cancel" : "Add Plan"}
              </button>
            </div>
            {showPlanForm && (
              <form onSubmit={handleCreatePlan} className="bg-card border border-border rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input className={inputClass} placeholder="Plan Name (e.g. 3-Month Plan)" required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                <input className={inputClass} placeholder="Number of Installments" type="number" min="2" required value={planForm.num_installments} onChange={(e) => setPlanForm({ ...planForm, num_installments: e.target.value })} />
                <input className={inputClass} placeholder="Description (optional)" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
                <button type="submit" className="bg-gradient-gold text-primary-foreground font-semibold py-2.5 rounded-md text-sm sm:col-span-3">Create Plan</button>
              </form>
            )}
            <div className="space-y-3">
              {installmentPlans.map((p: any) => (
                <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.description || "No description"}</p>
                  </div>
                  <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">
                    {p.num_installments} installments
                  </span>
                </div>
              ))}
              {installmentPlans.length === 0 && <p className="text-center text-muted-foreground py-12">No plans created yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
