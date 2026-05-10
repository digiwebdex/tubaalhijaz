import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Save, RotateCcw, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DEFAULT_CONFIG, clearPdfConfigCache, type PdfCompanyConfig } from "@/lib/pdfCompanyConfig";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function PdfSettingsManager() {
  const [config, setConfig] = useState<PdfCompanyConfig>({ ...DEFAULT_CONFIG });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient
        .from("company_settings")
        .select("setting_value")
        .eq("setting_key", "pdf_company")
        .maybeSingle();

      if (data?.setting_value) {
        const val = data.setting_value as any;
        setConfig({
          company_name: val.company_name || DEFAULT_CONFIG.company_name,
          tagline: val.tagline || DEFAULT_CONFIG.tagline,
          phone: val.phone || DEFAULT_CONFIG.phone,
          phone2: val.phone2 || DEFAULT_CONFIG.phone2,
          email: val.email || DEFAULT_CONFIG.email,
          address: val.address || DEFAULT_CONFIG.address,
          website: val.website || DEFAULT_CONFIG.website,
          footer_text: val.footer_text || DEFAULT_CONFIG.footer_text,
          footer_contact: val.footer_contact || DEFAULT_CONFIG.footer_contact,
        });
      }
    } catch (err) {
      console.error("Failed to load PDF settings", err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if setting exists
      const { data: existing } = await apiClient
        .from("company_settings")
        .select("id")
        .eq("setting_key", "pdf_company")
        .maybeSingle();

      if (existing?.id) {
        await apiClient
          .from("company_settings")
          .update({
            setting_value: config as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await apiClient
          .from("company_settings")
          .insert({
            setting_key: "pdf_company",
            setting_value: config as any,
          });
      }

      clearPdfConfigCache();
      toast.success("PDF settings saved successfully");
    } catch (err) {
      toast.error("Failed to save PDF settings");
    }
    setSaving(false);
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG });
    toast.info("Reset to default values (save to apply)");
  };

  const updateField = (key: keyof PdfCompanyConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure company information that appears in all PDF documents — Invoices, Receipts, Statements, and Reports.
      </p>

      {/* Company Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Company Name</Label>
          <Input
            className={inputClass}
            value={config.company_name}
            onChange={(e) => updateField("company_name", e.target.value)}
            placeholder="Company Name"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Tagline</Label>
          <Input
            className={inputClass}
            value={config.tagline}
            onChange={(e) => updateField("tagline", e.target.value)}
            placeholder="e.g. Hajj & Umrah Services"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Phone</Label>
          <Input
            className={inputClass}
            value={config.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="+880 1711-925400"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Phone 2</Label>
          <Input
            className={inputClass}
            value={config.phone2}
            onChange={(e) => updateField("phone2", e.target.value)}
            placeholder="(optional)"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Email</Label>
          <Input
            className={inputClass}
            value={config.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="info@triptastic.com.bd"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs font-semibold mb-1.5 block">Address</Label>
          <Input
            className={inputClass}
            value={config.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="Full address"
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs font-semibold mb-1.5 block">Website URL (for QR Code)</Label>
          <Input
            className={inputClass}
            value={config.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://triptastic.com.bd"
          />
        </div>
      </div>

      {/* Footer Settings */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-bold mb-3">PDF Footer Text</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Footer Main Text</Label>
            <Input
              className={inputClass}
              value={config.footer_text}
              onChange={(e) => updateField("footer_text", e.target.value)}
              placeholder="Thank you message"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Footer Contact Line</Label>
            <Input
              className={inputClass}
              value={config.footer_contact}
              onChange={(e) => updateField("footer_contact", e.target.value)}
              placeholder="Contact info shown at bottom of PDF"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="border border-border rounded-lg p-4 bg-secondary/50">
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> PDF Header Preview
        </h3>
        <div className="bg-background rounded-md p-4 border border-border">
          <p className="text-lg font-bold">{config.company_name || "Company Name"}</p>
          <p className="text-xs text-muted-foreground">{config.tagline || "Tagline"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tel: {config.phone || "—"} | Email: {config.email || "—"}
          </p>
          <p className="text-xs text-muted-foreground">{config.address || "Address"}</p>
          <div className="border-t border-primary/30 mt-2 pt-2">
            <p className="text-[10px] text-muted-foreground text-center font-semibold">{config.footer_text}</p>
            <p className="text-[9px] text-muted-foreground text-center">{config.footer_contact}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-gold text-primary-foreground">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save PDF Settings"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Default
        </Button>
      </div>
    </div>
  );
}
