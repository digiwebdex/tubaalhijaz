import { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { FileText, Download, Eye, X, Loader2, Search } from "lucide-react";

interface Props {
  bookings: any[];
}

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: "Passport Copy",
  nid: "NID / National ID",
  photo: "Passport Photo",
  other: "Other",
};

const AdminDocumentViewer = ({ bookings }: Props) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data } = await apiClient
      .from("booking_documents")
      .select("*, bookings(tracking_id), profiles:user_id(full_name)")
      .order("created_at", { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  };

  const getSignedUrl = async (filePath: string) => {
    const { data, error } = await apiClient.storage
      .from("booking-documents")
      .createSignedUrl(filePath, 300);
    if (error) return null;
    return data.signedUrl;
  };

  const handlePreview = async (doc: any) => {
    const url = await getSignedUrl(doc.file_path);
    if (url) {
      setPreviewUrl(url);
      setPreviewName(doc.file_name);
    }
  };

  const handleDownload = async (doc: any) => {
    const url = await getSignedUrl(doc.file_path);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const filtered = documents.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.bookings?.tracking_id?.toLowerCase().includes(q) ||
      d.profiles?.full_name?.toLowerCase().includes(q) ||
      d.document_type?.toLowerCase().includes(q) ||
      d.file_name?.toLowerCase().includes(q)
    );
  });

  const formatSize = (bytes: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading documents...
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, tracking ID, or document type..."
          className="w-full bg-secondary border border-border rounded-md pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No documents found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-3 pr-3">Booking</th>
                <th className="pb-3 pr-3">Customer</th>
                <th className="pb-3 pr-3">Document</th>
                <th className="pb-3 pr-3">File</th>
                <th className="pb-3 pr-3">Size</th>
                <th className="pb-3 pr-3">Date</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id} className="border-b border-border/50">
                  <td className="py-2.5 pr-3 font-mono text-xs text-primary">
                    {doc.bookings?.tracking_id?.replace(/^RK-/i, "TT-") || "—"}
                  </td>
                  <td className="py-2.5 pr-3">{doc.profiles?.full_name || "—"}</td>
                  <td className="py-2.5 pr-3">
                    <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                      {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs truncate max-w-[150px]">{doc.file_name}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{formatSize(doc.file_size)}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreview(doc)}
                        className="text-primary hover:text-primary/80 transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-primary hover:text-primary/80 transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <p className="text-sm font-medium truncate">{previewName}</p>
              <div className="flex items-center gap-2">
                <a href={previewUrl} download={previewName} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                  Download
                </a>
                <button onClick={() => setPreviewUrl(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-60px)] flex items-center justify-center">
              {previewName.match(/\.(pdf)$/i) ? (
                <iframe src={previewUrl} className="w-full h-[70vh] rounded" />
              ) : (
                <img src={previewUrl} alt={previewName} className="max-w-full max-h-[70vh] rounded object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDocumentViewer;
