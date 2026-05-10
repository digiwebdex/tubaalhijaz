import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Bell, Mail, MessageSquare, Loader2, Plus, Pencil, Trash2, X, Check, Save, Eye, EyeOff, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface NotificationSetting {
  id: string;
  event_key: string;
  event_label: string;
  enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
}

interface ApiConfig {
  resend_api_key: string;
  notification_from_email: string;
  bulksmsbd_api_key: string;
  bulksmsbd_sender_id: string;
}

export default function NotificationSettingsManager() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editItem, setEditItem] = useState<NotificationSetting | null>(null);
  const [form, setForm] = useState({ event_key: "", event_label: "" });
  const [deleting, setDeleting] = useState<string | null>(null);

  // API Config state
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    resend_api_key: "",
    notification_from_email: "",
    bulksmsbd_api_key: "",
    bulksmsbd_sender_id: "",
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await apiClient
      .from("notification_settings" as any)
      .select("*")
      .order("event_key");
    if (error) {
      toast.error("Failed to load notification settings");
    } else {
      setSettings((data as any[]) || []);
    }
    setLoading(false);
  };

  const fetchApiConfig = async () => {
    try {
      const { data, error } = await apiClient
        .from("company_settings" as any)
        .select("*")
        .eq("setting_key", "notification_api_config");
      if (!error && data && data.length > 0) {
        const val = typeof data[0].setting_value === 'string' ? JSON.parse(data[0].setting_value) : data[0].setting_value;
        setApiConfig({
          resend_api_key: val.resend_api_key || "",
          notification_from_email: val.notification_from_email || "",
          bulksmsbd_api_key: val.bulksmsbd_api_key || "",
          bulksmsbd_sender_id: val.bulksmsbd_sender_id || "",
        });
      }
    } catch (e) {
      console.error("Failed to load API config:", e);
    }
    setConfigLoaded(true);
  };

  useEffect(() => {
    fetchSettings();
    fetchApiConfig();
  }, []);

  const handleSaveApiConfig = async () => {
    setSavingConfig(true);
    try {
      // Check if setting exists
      const { data: existing } = await apiClient
        .from("company_settings" as any)
        .select("id")
        .eq("setting_key", "notification_api_config");

      if (existing && existing.length > 0) {
        const { error } = await apiClient
          .from("company_settings" as any)
          .update({
            setting_value: apiConfig as any,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await apiClient
          .from("company_settings" as any)
          .insert({
            setting_key: "notification_api_config",
            setting_value: apiConfig as any,
          } as any);
        if (error) throw error;
      }
      toast.success("API configuration saved! Update server .env to apply changes.");
    } catch (e: any) {
      toast.error("Failed to save API config: " + e.message);
    }
    setSavingConfig(false);
  };

  const handleToggle = async (id: string, field: "enabled" | "email_enabled" | "sms_enabled", value: boolean) => {
    setSaving(id + field);
    const { error } = await apiClient
      .from("notification_settings" as any)
      .update({ [field]: value, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update setting");
    } else {
      setSettings((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
      toast.success("Setting updated");
    }
    setSaving(null);
  };

  const handleAdd = async () => {
    if (!form.event_key.trim() || !form.event_label.trim()) {
      toast.error("Both fields are required");
      return;
    }
    setSaving("add");
    const { error } = await apiClient
      .from("notification_settings" as any)
      .insert({
        event_key: form.event_key.trim().toLowerCase().replace(/\s+/g, "_"),
        event_label: form.event_label.trim(),
        enabled: true,
        email_enabled: true,
        sms_enabled: true,
      } as any);
    if (error) {
      toast.error("Failed to add trigger");
    } else {
      toast.success("Trigger added");
      setForm({ event_key: "", event_label: "" });
      setShowAddDialog(false);
      fetchSettings();
    }
    setSaving(null);
  };

  const handleEdit = async () => {
    if (!editItem || !form.event_label.trim()) {
      toast.error("Label is required");
      return;
    }
    setSaving("edit");
    const { error } = await apiClient
      .from("notification_settings" as any)
      .update({
        event_key: form.event_key.trim().toLowerCase().replace(/\s+/g, "_"),
        event_label: form.event_label.trim(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", editItem.id);
    if (error) {
      toast.error("Failed to update trigger");
    } else {
      toast.success("Trigger updated");
      setEditItem(null);
      setForm({ event_key: "", event_label: "" });
      fetchSettings();
    }
    setSaving(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trigger?")) return;
    setDeleting(id);
    const { error } = await apiClient
      .from("notification_settings" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete trigger");
    } else {
      toast.success("Trigger deleted");
      setSettings((prev) => prev.filter((s) => s.id !== id));
    }
    setDeleting(null);
  };

  const openEdit = (s: NotificationSetting) => {
    setEditItem(s);
    setForm({ event_key: s.event_key, event_label: s.event_label });
  };

  const getChannelLabel = (s: NotificationSetting) => {
    if (!s.enabled) return "Disabled";
    const channels = [];
    if (s.email_enabled) channels.push("Email");
    if (s.sms_enabled) channels.push("SMS");
    return channels.length ? channels.join(" + ") : "No channel";
  };

  const toggleKeyVisibility = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const maskValue = (val: string) => {
    if (!val) return "";
    if (val.length <= 8) return "••••••••";
    return val.substring(0, 4) + "••••" + val.substring(val.length - 4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== API Configuration Section ===== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" /> API Configuration
          </p>
          <Button size="sm" onClick={handleSaveApiConfig} disabled={savingConfig}>
            {savingConfig ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Config
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email Provider */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm">Email Provider (Resend)</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">RESEND API Key</label>
              <div className="relative">
                <Input
                  type={showKeys.resend ? "text" : "password"}
                  placeholder="re_xxxxxxxxxxxx"
                  value={apiConfig.resend_api_key}
                  onChange={(e) => setApiConfig({ ...apiConfig, resend_api_key: e.target.value })}
                  className="pr-10 text-xs"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleKeyVisibility("resend")}
                >
                  {showKeys.resend ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">From Email</label>
              <Input
                type="email"
                placeholder="noreply@yourdomain.com"
                value={apiConfig.notification_from_email}
                onChange={(e) => setApiConfig({ ...apiConfig, notification_from_email: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          {/* SMS Provider */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-primary" />
              <p className="font-semibold text-sm">SMS Provider (BulkSMSBD)</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">BulkSMSBD API Key</label>
              <div className="relative">
                <Input
                  type={showKeys.sms ? "text" : "password"}
                  placeholder="Enter API key"
                  value={apiConfig.bulksmsbd_api_key}
                  onChange={(e) => setApiConfig({ ...apiConfig, bulksmsbd_api_key: e.target.value })}
                  className="pr-10 text-xs"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => toggleKeyVisibility("sms")}
                >
                  {showKeys.sms ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sender ID</label>
              <Input
                type="text"
                placeholder="e.g. TripTastic"
                value={apiConfig.bulksmsbd_sender_id}
                onChange={(e) => setApiConfig({ ...apiConfig, bulksmsbd_sender_id: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Note:</strong> These API keys are stored securely in the database. 
            After saving, update the corresponding environment variables on the server (<code className="text-primary">RESEND_API_KEY</code>, <code className="text-primary">BULKSMSBD_API_KEY</code>, <code className="text-primary">BULKSMSBD_SENDER_ID</code>, <code className="text-primary">NOTIFICATION_FROM_EMAIL</code>) and restart the service.
          </p>
        </div>
      </div>

      {/* ===== Triggers Section ===== */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Automated Triggers</p>
        <Button size="sm" onClick={() => { setForm({ event_key: "", event_label: "" }); setShowAddDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Trigger
        </Button>
      </div>

      {/* Triggers Grid */}
      {settings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No triggers configured yet. Click "Add Trigger" to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {settings.map((s) => (
            <div
              key={s.id}
              className={`bg-secondary/50 border border-border rounded-lg p-4 transition-opacity ${!s.enabled ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={(v) => handleToggle(s.id, "enabled", v)}
                    disabled={saving === s.id + "enabled"}
                  />
                  <div>
                    <p className="font-medium text-sm">{s.event_label}</p>
                    <p className="text-xs text-muted-foreground">{getChannelLabel(s)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {s.enabled && (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch
                          checked={s.email_enabled}
                          onCheckedChange={(v) => handleToggle(s.id, "email_enabled", v)}
                          disabled={saving === s.id + "email_enabled"}
                          className="scale-90"
                        />
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Email</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch
                          checked={s.sms_enabled}
                          onCheckedChange={(v) => handleToggle(s.id, "sms_enabled", v)}
                          disabled={saving === s.id + "sms_enabled"}
                          className="scale-90"
                        />
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">SMS</span>
                      </label>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(s.id)}
                    disabled={deleting === s.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">How it works:</strong> Toggle triggers on/off and choose which channels (Email/SMS) each event uses.
          Changes take effect immediately. Disabled triggers will not send any notifications.
          All delivery logs are visible in the <strong>Notifications</strong> page.
        </p>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notification Trigger</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Event Key</label>
              <Input
                placeholder="e.g. booking_cancelled"
                value={form.event_key}
                onChange={(e) => setForm({ ...form, event_key: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Unique identifier (lowercase, underscores)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Event Label</label>
              <Input
                placeholder="e.g. Booking Cancelled"
                value={form.event_label}
                onChange={(e) => setForm({ ...form, event_label: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Display name shown in the admin panel</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving === "add"}>
              {saving === "add" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trigger</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Event Key</label>
              <Input
                value={form.event_key}
                onChange={(e) => setForm({ ...form, event_key: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Event Label</label>
              <Input
                value={form.event_label}
                onChange={(e) => setForm({ ...form, event_label: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving === "edit"}>
              {saving === "edit" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
