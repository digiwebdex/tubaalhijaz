import { useState, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

interface Props {
  onUpload: (url: string) => void;
  currentUrl?: string;
  label?: string;
  sizeHint?: string;
}

export default function BannerImageUpload({ onUpload, currentUrl, label = "Upload Banner", sizeHint }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `banners/${Date.now()}.${ext}`;

    const { error } = await apiClient.storage.from("company-assets").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }

    const { data: { publicUrl } } = apiClient.storage.from("company-assets").getPublicUrl(path);
    setPreview(publicUrl);
    onUpload(publicUrl);
    setUploading(false);
    toast.success("Banner uploaded!");
  };

  const clear = () => {
    setPreview(null);
    onUpload("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      {sizeHint && <p className="text-[10px] text-muted-foreground mb-1">{sizeHint}</p>}
      {preview ? (
        <div className="relative group rounded-lg overflow-hidden border border-border">
          <img src={preview} alt="Preview" className="w-full h-28 object-cover" />
          <button onClick={clear} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          <span className="text-xs">{uploading ? "Uploading..." : label}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
    </div>
  );
}
