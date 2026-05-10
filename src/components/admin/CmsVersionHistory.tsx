import { useState } from "react";
import { useCmsVersions } from "@/hooks/useSiteContent";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { History, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero Section",
  services: "Services Section",
  about: "About Section",
  contact: "Contact Section",
  footer: "Footer",
  navbar: "Navbar",
};

export default function CmsVersionHistory() {
  const [filterSection, setFilterSection] = useState<string>("");
  const { data: versions = [], isLoading } = useCmsVersions(filterSection || undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const restoreVersion = async (version: any) => {
    const { data: { session } } = await apiClient.auth.getSession();

    // Save current content as a version first
    const { data: current } = await apiClient
      .from("site_content" as any)
      .select("content")
      .eq("section_key", version.section_key)
      .maybeSingle();

    if ((current as any)?.content) {
      await apiClient.from("cms_versions" as any).insert({
        section_key: version.section_key,
        content: (current as any).content,
        updated_by: session?.user?.id || null,
        note: "Auto-saved before restore",
      } as any);
    }

    // Restore the selected version
    const { error } = await apiClient
      .from("site_content" as any)
      .update({ content: version.content, updated_by: session?.user?.id || null } as any)
      .eq("section_key", version.section_key);

    if (error) { toast.error(error.message); return; }
    toast.success(`Restored ${SECTION_LABELS[version.section_key] || version.section_key} to version from ${new Date(version.created_at).toLocaleString()}`);
    queryClient.invalidateQueries({ queryKey: ["site_content"] });
    queryClient.invalidateQueries({ queryKey: ["cms_versions"] });
  };

  if (isLoading) return <p className="text-center text-muted-foreground py-12">Loading versions...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">{versions.length} saved versions</p>
        </div>
        <select
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
        >
          <option value="">All Sections</option>
          {Object.entries(SECTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {versions.map((v: any) => {
          const isExpanded = expandedId === v.id;
          return (
            <div key={v.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {SECTION_LABELS[v.section_key] || v.section_key}
                    </span>
                    {v.note && <span className="text-xs text-muted-foreground">{v.note}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(v.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); restoreVersion(v); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Restore
                  </button>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-border p-4">
                  <pre className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(v.content, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
        {versions.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No version history yet. Versions are saved automatically when you update content.</p>
        )}
      </div>
    </div>
  );
}
