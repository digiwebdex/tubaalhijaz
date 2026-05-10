import { useState, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, X, Loader2, Images } from "lucide-react";

interface Props {
  hotelId: string;
  gallery: string[];
  onUpdate: () => void;
}

export default function HotelGalleryManager({ hotelId, gallery, onUpdate }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) continue;

      const ext = file.name.split(".").pop();
      const path = `hotels/${hotelId}/gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await apiClient.storage.from("hotel-images").upload(path, file);
      if (error) continue;

      const { data: { publicUrl } } = apiClient.storage.from("hotel-images").getPublicUrl(path);
      newUrls.push(publicUrl);
    }

    if (newUrls.length > 0) {
      const updated = [...gallery, ...newUrls];
      const { error } = await apiClient.from("hotels").update({ gallery: updated }).eq("id", hotelId);
      if (error) toast.error(error.message);
      else { toast.success(`${newUrls.length} image(s) added`); onUpdate(); }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeImage = async (url: string) => {
    const updated = gallery.filter((u) => u !== url);
    const { error } = await apiClient.from("hotels").update({ gallery: updated }).eq("id", hotelId);
    if (error) toast.error(error.message);
    else { toast.success("Image removed"); onUpdate(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
          <Images className="h-3.5 w-3.5" /> Gallery ({gallery.length})
        </h5>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          {uploading ? "Uploading..." : "Add Photos"}
        </button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {gallery.map((url, i) => (
          <div key={i} className="relative group rounded-md overflow-hidden border border-border aspect-square">
            <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(url)}
              className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
    </div>
  );
}
