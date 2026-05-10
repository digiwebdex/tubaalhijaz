import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Menu } from "lucide-react";

const MENU_ITEMS = [
  { key: "home", label: "হোম / Home" },
  { key: "services", label: "সেবাসমূহ / Services" },
  { key: "packages", label: "প্যাকেজ / Packages" },
  { key: "hotels", label: "হোটেল / Hotels" },
  { key: "gallery", label: "গ্যালারি / Gallery" },
  { key: "about", label: "আমাদের সম্পর্কে / About" },
  { key: "contact", label: "যোগাযোগ / Contact" },
  { key: "track", label: "ট্র্যাক / Track Booking" },
];

export type MenuVisibility = Record<string, boolean>;

const getDefaults = (): MenuVisibility => {
  const d: MenuVisibility = {};
  MENU_ITEMS.forEach((m) => (d[m.key] = true));
  return d;
};

export function useMenuVisibility() {
  const [visibility, setVisibility] = useState<MenuVisibility>(getDefaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiClient
      .from("company_settings")
      .select("*")
      .eq("setting_key", "menu_visibility")
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.setting_value) {
          const saved = typeof data.setting_value === "string" ? JSON.parse(data.setting_value) : data.setting_value;
          setVisibility((prev) => ({ ...prev, ...saved }));
        }
        setLoaded(true);
      });
  }, []);

  return { visibility, loaded };
}

export default function MenuVisibilityManager() {
  const [visibility, setVisibility] = useState<MenuVisibility>(getDefaults);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiClient
      .from("company_settings")
      .select("*")
      .eq("setting_key", "menu_visibility")
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.setting_value) {
          const saved = typeof data.setting_value === "string" ? JSON.parse(data.setting_value) : data.setting_value;
          setVisibility((prev) => ({ ...prev, ...saved }));
        }
        setLoaded(true);
      });
  }, []);

  const toggle = (key: string) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: existing } = await apiClient
      .from("company_settings")
      .select("id")
      .eq("setting_key", "menu_visibility")
      .maybeSingle();

    let error;
    if (existing?.id) {
      ({ error } = await apiClient
        .from("company_settings")
        .update({ setting_value: visibility })
        .eq("id", existing.id));
    } else {
      ({ error } = await apiClient
        .from("company_settings")
        .insert({ setting_key: "menu_visibility", setting_value: visibility }));
    }

    setSaving(false);
    if (error) {
      toast.error("Failed to save menu visibility");
    } else {
      toast.success("Menu visibility saved!");
    }
  };

  if (!loaded) return <div className="text-sm text-muted-foreground py-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => toggle(item.key)}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
              visibility[item.key]
                ? "border-primary/30 bg-primary/5 text-foreground"
                : "border-border bg-muted/50 text-muted-foreground"
            }`}
          >
            {visibility[item.key] ? (
              <Eye className="h-4 w-4 text-primary flex-shrink-0" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <div>
              <span className="text-sm font-medium">{item.label}</span>
              <span className={`block text-xs ${visibility[item.key] ? "text-primary" : "text-muted-foreground"}`}>
                {visibility[item.key] ? "Visible" : "Hidden"}
              </span>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save Menu Settings"}
      </button>
    </div>
  );
}
