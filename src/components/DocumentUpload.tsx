import { useState, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Check, Loader2 } from "lucide-react";

interface Props {
  bookingId: string;
  userId: string;
  documents: any[];
  onUploaded: () => void;
}

const DOC_TYPES = [
  { key: "passport", label: "Passport Copy", required: true },
  { key: "nid", label: "NID / National ID", required: true },
  { key: "photo", label: "Passport Photo", required: true },
] as const;

const DOC_TYPE_ALIASES: Record<string, string> = {
  passport: "passport",
  passport_copy: "passport",
  nid: "nid",
  nid_copy: "nid",
  national_id: "nid",
  national_id_copy: "nid",
  photo: "photo",
  passport_photo: "photo",
  passport_size_photo: "photo",
  passport_size: "photo",
};

const normalizeDocType = (value?: string | null) => {
  const normalized = (value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return DOC_TYPE_ALIASES[normalized] || normalized;
};

const DocumentUpload = ({ bookingId, userId, documents, onUploaded }: Props) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeType, setActiveType] = useState<string>("");

  const getDocForType = (type: string) => documents.find((d) => normalizeDocType(d.document_type) === normalizeDocType(type));

  const handleUpload = async (file: File, docType: string) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }

    setUploading(docType);
    const ext = file.name.split(".").pop();
    const filePath = `${userId}/${bookingId}/${docType}_${Date.now()}.${ext}`;

    const { error: uploadError } = await apiClient.storage
      .from("booking-documents")
      .upload(filePath, file);

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(null);
      return;
    }

    // Remove old doc record if exists
    const existing = getDocForType(docType);
    if (existing) {
      await apiClient.from("booking_documents").delete().eq("id", existing.id);
      if (existing.file_path) {
        await apiClient.storage.from("booking-documents").remove([existing.file_path]);
      }
    }

    const { error: dbError } = await apiClient.from("booking_documents").insert({
      booking_id: bookingId,
      user_id: userId,
      document_type: docType,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
    });

    if (dbError) {
      toast.error(dbError.message);
    } else {
      toast.success(`${docType.charAt(0).toUpperCase() + docType.slice(1)} uploaded successfully`);
      onUploaded();
    }
    setUploading(null);
  };

  const handleDelete = async (doc: any) => {
    await apiClient.storage.from("booking-documents").remove([doc.file_path]);
    await apiClient.from("booking_documents").delete().eq("id", doc.id);
    toast.success("Document removed");
    onUploaded();
  };

  const triggerFileInput = (docType: string) => {
    setActiveType(docType);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeType) handleUpload(file, activeType);
          e.target.value = "";
        }}
      />
      {DOC_TYPES.map(({ key, label, required }) => {
        const doc = getDocForType(key);
        const isUploading = uploading === key;
        return (
          <div
            key={key}
            className={`border rounded-lg p-3 flex items-center justify-between gap-3 transition-colors ${
              doc ? "border-primary/30 bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${doc ? "bg-primary/20" : "bg-secondary"}`}>
                {doc ? <Check className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {label} {required && <span className="text-destructive">*</span>}
                </p>
                {doc && (
                  <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {doc && (
                <button
                  onClick={() => handleDelete(doc)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => triggerFileInput(key)}
                disabled={isUploading}
                className="bg-gradient-gold text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {doc ? "Replace" : "Upload"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentUpload;
