import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Upload, Trash2, Save, Stamp, PenTool } from "lucide-react";

const inputClass = "w-full bg-secondary border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

interface SignatureSettings {
  authorized_name: string;
  designation: string;
  signature_url: string;
  stamp_url: string;
}

export default function SignatureSettingsManager() {
  const [settings, setSettings] = useState<SignatureSettings>({
    authorized_name: "",
    designation: "",
    signature_url: "",
    stamp_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const sigRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await apiClient
      .from("company_settings")
      .select("setting_value")
      .eq("setting_key", "signature")
      .maybeSingle();
    if (data?.setting_value) {
      const val = data.setting_value as any;
      setSettings({
        authorized_name: val.authorized_name || "",
        designation: val.designation || "",
        signature_url: val.signature_url || "",
        stamp_url: val.stamp_url || "",
      });
    }
    setLoading(false);
  };

  const uploadFile = async (file: File, type: "signature" | "stamp") => {
    const setter = type === "signature" ? setUploadingSignature : setUploadingStamp;
    setter(true);
    const ext = file.name.split(".").pop();
    const path = `${type}/${Date.now()}.${ext}`;

    const { error } = await apiClient.storage
      .from("company-assets")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      setter(false);
      return;
    }

    const { data: urlData } = apiClient.storage
      .from("company-assets")
      .getPublicUrl(path);

    const newSettings = {
      ...settings,
      [type === "signature" ? "signature_url" : "stamp_url"]: urlData.publicUrl,
    };
    setSettings(newSettings);
    await saveSettings(newSettings);
    setter(false);
    toast.success(`${type === "signature" ? "Signature" : "Stamp"} uploaded`);
  };

  const removeImage = async (type: "signature" | "stamp") => {
    const key = type === "signature" ? "signature_url" : "stamp_url";
    const newSettings = { ...settings, [key]: "" };
    setSettings(newSettings);
    await saveSettings(newSettings);
    toast.success(`${type === "signature" ? "Signature" : "Stamp"} removed`);
  };

  const saveSettings = async (data?: SignatureSettings) => {
    setSaving(true);
    const toSave = data || settings;
    const { data: session } = await apiClient.auth.getSession();
    const userId = session?.session?.user?.id || null;

    // Try update first
    const { data: updateResult, error: updateError } = await apiClient
      .from("company_settings")
      .update({
        setting_value: toSave as any,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("setting_key", "signature")
      .select();

    // If no rows updated, insert
    if (!updateError && (!updateResult || (updateResult as any[]).length === 0)) {
      const { error: insertError } = await apiClient
        .from("company_settings")
        .insert({
          setting_key: "signature",
          setting_value: toSave as any,
          updated_by: userId,
        });
      if (insertError) toast.error(insertError.message);
      else if (!data) toast.success("Settings saved");
    } else if (updateError) {
      toast.error(updateError.message);
    } else if (!data) {
      toast.success("Settings saved");
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground text-sm py-4">Loading...</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Upload your signature and stamp once. They will automatically appear on all generated PDFs (invoices, receipts, reports).
      </p>

      {/* Name & Designation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Authorized Person Name</label>
          <input
            className={inputClass}
            placeholder="e.g. Md. Shahidul Islam"
            value={settings.authorized_name}
            onChange={(e) => setSettings({ ...settings, authorized_name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Designation</label>
          <input
            className={inputClass}
            placeholder="e.g. Managing Director"
            value={settings.designation}
            onChange={(e) => setSettings({ ...settings, designation: e.target.value })}
          />
        </div>
      </div>

      {/* Signature Upload */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-secondary/50 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <PenTool className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Signature Image</span>
          </div>
          {settings.signature_url ? (
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-border">
                <img src={settings.signature_url} alt="Signature" className="max-h-20 object-contain mx-auto" />
              </div>
              <button onClick={() => removeImage("signature")} className="text-destructive text-xs flex items-center gap-1 hover:underline">
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={sigRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "signature")}
              />
              <button
                onClick={() => sigRef.current?.click()}
                disabled={uploadingSignature}
                className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground hover:border-primary/50 transition-colors"
              >
                <Upload className="h-6 w-6 mx-auto mb-2" />
                <span className="text-xs">{uploadingSignature ? "Uploading..." : "Upload Signature (PNG/JPG)"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Stamp Upload */}
        <div className="bg-secondary/50 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Stamp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Company Stamp (Optional)</span>
          </div>
          {settings.stamp_url ? (
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-border">
                <img src={settings.stamp_url} alt="Stamp" className="max-h-20 object-contain mx-auto" />
              </div>
              <button onClick={() => removeImage("stamp")} className="text-destructive text-xs flex items-center gap-1 hover:underline">
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={stampRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "stamp")}
              />
              <button
                onClick={() => stampRef.current?.click()}
                disabled={uploadingStamp}
                className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground hover:border-primary/50 transition-colors"
              >
                <Upload className="h-6 w-6 mx-auto mb-2" />
                <span className="text-xs">{uploadingStamp ? "Uploading..." : "Upload Stamp (PNG/JPG)"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {(settings.authorized_name || settings.signature_url) && (
        <div className="bg-white border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Preview (as it appears on PDFs)</p>
          <div className="flex justify-between items-end pt-8">
            <div className="text-center">
              <div className="border-t border-gray-400 w-48 mb-1"></div>
              <p className="text-xs text-gray-500">Customer Signature</p>
            </div>
            <div className="text-center">
              {settings.stamp_url && (
                <img src={settings.stamp_url} alt="Stamp" className="max-h-16 object-contain mx-auto mb-1 opacity-70" />
              )}
              {settings.signature_url && (
                <img src={settings.signature_url} alt="Signature" className="max-h-12 object-contain mx-auto mb-1" />
              )}
              <div className="border-t border-gray-400 w-48 mb-1"></div>
              <p className="text-xs text-gray-800 font-semibold">{settings.authorized_name || "Authorized Person"}</p>
              <p className="text-[10px] text-gray-500">{settings.designation || "Designation"}</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => saveSettings()}
        disabled={saving}
        className="bg-gradient-gold text-primary-foreground text-sm font-semibold px-6 py-2.5 rounded-md flex items-center gap-2"
      >
        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
