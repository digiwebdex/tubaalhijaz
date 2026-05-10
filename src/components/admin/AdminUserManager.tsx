import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, X, Shield, Trash2, Users, Eye, EyeOff, Pencil, Ban, CheckCircle, UserPlus } from "lucide-react";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";
const ROLES = ["admin", "accountant", "booking", "cms", "viewer"];
const PRIMARY_ADMIN_EMAIL = "admin@triptastic.com.bd";

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access to all modules — including Profit, CMS, Settings, Role Management",
  accountant: "Bookings, Customers, Moallems, Supplier, Payments, Reports — cannot view Profit",
  booking: "Only Bookings & Customers create/edit — no access to financial modules",
  cms: "Only CMS content management — no access to financial data",
  viewer: "Read-only access to all modules — cannot make any changes",
};

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  role: string | null;
  role_id: string | null;
}

export default function AdminUserManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    role: "viewer",
    status: "active",
  });

  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "",
    status: "",
    password: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      apiClient.from("profiles").select("user_id, full_name, phone, email, status, created_at").order("created_at", { ascending: false }),
      apiClient.from("user_roles").select("*"),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];

    const merged: UserWithRole[] = profiles.map((p) => {
      const userRole = roles.find((r) => r.user_id === p.user_id);
      return {
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        status: (p as any).status || "active",
        created_at: p.created_at,
        role: userRole?.role || null,
        role_id: userRole?.id || null,
      };
    });

    setUsers(merged);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setCreating(true);
    const { data, error } = await apiClient.functions.invoke("auth/admin/create-user", {
      body: {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
        status: form.status,
      },
    });

    setCreating(false);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to create user");
      return;
    }

    toast.success("User created successfully");
    setShowCreateForm(false);
    setForm({ full_name: "", email: "", password: "", confirm_password: "", role: "viewer", status: "active" });
    fetchUsers();
  };

  const handleAction = async (userId: string, action: string, updates?: any) => {
    setActionLoading(userId);
    const { data, error } = await apiClient.functions.invoke("auth/admin/manage-user", {
      body: { action, target_user_id: userId, updates },
    });

    setActionLoading(null);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Action failed");
      return;
    }

    toast.success(data?.message || "Action completed");
    setEditingUser(null);
    fetchUsers();
  };

  const handleEditSave = (userId: string) => {
    const updates: any = {};
    if (editForm.full_name) updates.full_name = editForm.full_name;
    if (editForm.role) updates.role = editForm.role;
    if (editForm.status) updates.status = editForm.status;
    if (editForm.password && editForm.password.length >= 6) updates.password = editForm.password;
    handleAction(userId, "update", updates);
  };

  const startEdit = (user: UserWithRole) => {
    setEditingUser(user.user_id);
    setEditForm({
      full_name: user.full_name || "",
      role: user.role || "viewer",
      status: user.status || "active",
      password: "",
    });
  };

  const isPrimary = (u: UserWithRole) => u.email === PRIMARY_ADMIN_EMAIL;

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "admin": return "bg-red-500/10 text-red-600";
      case "accountant": return "bg-blue-500/10 text-blue-600";
      case "booking": return "bg-green-500/10 text-green-600";
      case "cms": return "bg-purple-500/10 text-purple-600";
      case "viewer": return "bg-amber-500/10 text-amber-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-heading text-xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> User Management
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md flex items-center gap-2"
        >
          {showCreateForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showCreateForm ? "Cancel" : "Create User"}
        </button>
      </div>

      {/* Role Matrix */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-xs font-semibold mb-2 text-muted-foreground">Access Matrix</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {ROLES.map((r) => (
            <div key={r} className="space-y-1">
              <p className="font-semibold text-primary capitalize">{r}</p>
              <p className="text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Create New User
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
              <input className={inputClass} placeholder="Enter full name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
              <input className={inputClass} type="email" placeholder="user@example.com" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="relative">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Password *</label>
              <input
                className={inputClass}
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" className="absolute right-3 top-7 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirm Password *</label>
              <input
                className={inputClass}
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter password"
                required
                minLength={6}
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              />
              {form.confirm_password && form.password !== form.confirm_password && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role *</label>
              <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-gradient-gold text-primary-foreground font-semibold py-2.5 px-6 rounded-md text-sm disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create User"}
          </button>
        </form>
      )}

      {/* User List Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">No users found</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.user_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    {editingUser === u.user_id ? (
                      <>
                        <td className="px-4 py-3">
                          <input className={inputClass} value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          {isPrimary(u) ? (
                            <span className="text-xs font-bold text-primary">Admin (Protected)</span>
                          ) : (
                            <select className="bg-secondary border border-border rounded px-2 py-1 text-xs" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select className="bg-secondary border border-border rounded px-2 py-1 text-xs" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td className="px-4 py-3" colSpan={1}>
                          <input className={inputClass} type="password" placeholder="New password (optional)" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button onClick={() => handleEditSave(u.user_id)} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded font-medium" disabled={actionLoading === u.user_id}>
                            Save
                          </button>
                          <button onClick={() => setEditingUser(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="font-medium">{u.full_name || u.phone || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{u.email || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${getRoleBadgeColor(u.role)}`}>
                            {u.role || "No role"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.status === "active" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                            {u.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPrimary(u) ? (
                            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">Primary Admin</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => startEdit(u)} className="p-1.5 rounded hover:bg-muted" title="Edit">
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              {u.status === "active" ? (
                                <button
                                  onClick={() => handleAction(u.user_id, "deactivate")}
                                  className="p-1.5 rounded hover:bg-muted"
                                  title="Deactivate"
                                  disabled={actionLoading === u.user_id}
                                >
                                  <Ban className="h-3.5 w-3.5 text-amber-500" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAction(u.user_id, "activate")}
                                  className="p-1.5 rounded hover:bg-muted"
                                  title="Activate"
                                  disabled={actionLoading === u.user_id}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (confirm(`Delete user "${u.full_name || u.email}"? This cannot be undone.`)) {
                                    handleAction(u.user_id, "delete");
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-muted"
                                title="Delete"
                                disabled={actionLoading === u.user_id}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
