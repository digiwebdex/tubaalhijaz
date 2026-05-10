import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Eye, EyeOff, Save, LayoutGrid } from "lucide-react";
import { DEFAULT_SECTIONS, SectionVisibility } from "@/hooks/useSectionVisibility";

export default function SectionVisibilityManager() {
  const [visibility, setVisibility] = useState<SectionVisibility>(() => {
    const defaults: SectionVisibility = {};
    Object.entries(DEFAULT_SECTIONS).forEach(([key, val]) => {
      defaults[key] = val.enabled;
    });
    return defaults;
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiClient
      .from("company_settings")
      .select("*")
      .eq("setting_key", "section_visibility")
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
    // Check if setting already exists
    const { data: existing } = await apiClient
      .from("company_settings")
      .select("id")
      .eq("setting_key", "section_visibility")
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
        .insert({ setting_key: "section_visibility", setting_value: visibility }));
    }

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Section visibility saved!");
    }
  };

  if (!loaded) return <div className="text-center text-muted-foreground py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(DEFAULT_SECTIONS).map(([key, section]) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
              visibility[key]
                ? "bg-primary/10 border-primary/30 text-foreground"
                : "bg-muted/50 border-border text-muted-foreground"
            }`}
          >
            <div>
              <p className="text-sm font-medium">{section.label}</p>
              <p className="text-xs opacity-70">{section.labelBn}</p>
            </div>
            {visibility[key] ? (
              <Eye className="h-4 w-4 text-primary flex-shrink-0" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-6 py-2.5 rounded-md flex items-center gap-2 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save Visibility Settings"}
      </button>
    </div>
  );
}
