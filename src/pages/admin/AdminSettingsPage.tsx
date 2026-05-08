import { useEffect, useState } from "react";
import { supabase } from "@/lib/api";
import { toast } from "sonner";
import { Plus, X, Bell, PenTool, Database, LayoutGrid, FileText, Coins } from "lucide-react";
import AdminDocumentViewer from "@/components/AdminDocumentViewer";
import CurrencyRateSettings from "@/components/admin/CurrencyRateSettings";
import { useAdminRole } from "@/components/admin/AdminLayout";
import NotificationSettingsManager from "@/components/admin/NotificationSettingsManager";
import SignatureSettingsManager from "@/components/admin/SignatureSettingsManager";
import PdfSettingsManager from "@/components/admin/PdfSettingsManager";
import AdminUserManager from "@/components/admin/AdminUserManager";
import BackupRestoreManager from "@/components/admin/BackupRestoreManager";
import AdminPasswordChange from "@/components/admin/AdminPasswordChange";
import SectionVisibilityManager from "@/components/admin/SectionVisibilityManager";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function AdminSettingsPage() {
  const currentRole = useAdminRole();
  const [installmentPlans, setInstallmentPlans] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", num_installments: "3", description: "" });

  useEffect(() => {
    Promise.all([
      supabase.from("installment_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
    ]).then(([ip, bk]) => {
      setInstallmentPlans(ip.data || []);
      setBookings(bk.data || []);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("installment_plans").insert({
      name: form.name, num_installments: parseInt(form.num_installments), description: form.description || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Plan created");
    setShowForm(false);
    setForm({ name: "", num_installments: "3", description: "" });
    supabase.from("installment_plans").select("*").order("created_at", { ascending: false }).then(({ data }) => setInstallmentPlans(data || []));
  };

  return (
    <div className="space-y-8">
      {currentRole === "admin" && (
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-heading text-lg font-bold mb-3">Quick Settings</h2>
          <div className="flex flex-wrap gap-2">
            <a href="#password-settings" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-md text-sm font-medium">Change Password</a>
            <a href="#section-visibility" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-md text-sm font-medium">Website Sections</a>
            <a href="#pdf-settings" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-md text-sm font-medium">PDF Settings</a>
            <a href="#notification-settings" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-md text-sm font-medium">SMS/Email Config</a>
            <a href="#backup-restore" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-md text-sm font-medium">Backup & Restore</a>
          </div>
        </section>
      )}

      {/* Password Change (Admin only) */}
      {currentRole === "admin" && (
        <section id="password-settings">
          <AdminPasswordChange />
        </section>
      )}

      {/* User Management (Admin only) */}
      {currentRole === "admin" && (
        <section id="user-management">
          <AdminUserManager />
        </section>
      )}

      {/* Section Visibility (Admin only) */}
      {currentRole === "admin" && (
        <section id="section-visibility">
          <h2 className="font-heading text-xl font-bold flex items-center gap-2 mb-4">
            <LayoutGrid className="h-5 w-5 text-primary" /> Website Section Visibility
          </h2>
          <div className="bg-card border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-4">
              Enable or disable individual sections on your public website. Disabled sections will be hidden from visitors.
            </p>
            <SectionVisibilityManager />
          </div>
        </section>
      )}

      {/* Installment Plans */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-heading text-xl font-bold">Installment Plans</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancel" : "Add Plan"}
          </button>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input className={inputClass} placeholder="Plan Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inputClass} placeholder="Number of Installments" type="number" min="2" required value={form.num_installments} onChange={(e) => setForm({ ...form, num_installments: e.target.value })} />
            <input className={inputClass} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
              <span className="bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">{p.num_installments} installments</span>
            </div>
          ))}
          {installmentPlans.length === 0 && <p className="text-center text-muted-foreground py-12">No plans created yet.</p>}
        </div>
      </section>

      {/* Notification & Automation Settings (Admin only) */}
      {currentRole === "admin" && (
        <section id="notification-settings">
          <h2 className="font-heading text-xl font-bold flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" /> Notification & Automation
          </h2>
          <div className="bg-card border border-border rounded-lg p-5">
            <NotificationSettingsManager />
          </div>
        </section>
      )}

      {/* Riyal Rate / Currency (Admin only) */}
      {currentRole === "admin" && (
        <section id="currency-rate">
          <h2 className="font-heading text-xl font-bold flex items-center gap-2 mb-4">
            <Coins className="h-5 w-5 text-primary" /> Riyal Rate & Currency Display
          </h2>
          <div className="bg-card border border-border rounded-lg p-5">
            <CurrencyRateSettings />
          </div>
        </section>
      )}

      {/* PDF Company Settings (Admin only) */}
      {currentRole === "admin" && (
        <section id="pdf-settings">
          <h2 className="font-heading text-xl font-bold flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" /> PDF Company Settings
          </h2>
          <div className="bg-card border border-border rounded-lg p-5">
            <PdfSettingsManager />
          </div>
        </section>
      )}

      {/* Signature & Stamp Settings (Admin only) */}
      {currentRole === "admin" && (
        <section>
          <h2 className="font-heading text-xl font-bold flex items-center gap-2 mb-4">
            <PenTool className="h-5 w-5 text-primary" /> PDF Signature & Stamp
          </h2>
          <div className="bg-card border border-border rounded-lg p-5">
            <SignatureSettingsManager />
          </div>
        </section>
      )}

      {/* Backup & Restore (Admin only) */}
      {currentRole === "admin" && (
        <section id="backup-restore">
          <h2 className="font-heading text-xl font-bold flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-primary" /> Backup & Restore
          </h2>
          <div className="bg-card border border-border rounded-lg p-5">
            <BackupRestoreManager />
          </div>
        </section>
      )}

      {/* Documents */}
      <section>
        <h2 className="font-heading text-xl font-bold mb-4">Customer Documents</h2>
        <AdminDocumentViewer bookings={bookings} />
      </section>
    </div>
  );
}
