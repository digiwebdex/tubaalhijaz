import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

export function useSiteContent(sectionKey: string) {
  return useQuery({
    queryKey: ["site_content", sectionKey],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("site_content" as any)
        .select("content")
        .eq("section_key", sectionKey)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.content || null;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAllSiteContent() {
  return useQuery({
    queryKey: ["site_content", "all"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("site_content" as any)
        .select("*")
        .order("section_key");
      if (error) throw error;
      const map: Record<string, any> = {};
      (data as any[])?.forEach((row: any) => {
        map[row.section_key] = row.content;
      });
      return map;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateSiteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sectionKey, content }: { sectionKey: string; content: any }) => {
      const { data: { session } } = await apiClient.auth.getSession();
      const userId = session?.user?.id || null;

      // Check if row exists
      const { data: existing } = await apiClient
        .from("site_content" as any)
        .select("id, content")
        .eq("section_key", sectionKey)
        .maybeSingle();

      // Save version history if there's existing content
      if ((existing as any)?.content && Object.keys((existing as any).content).length > 0) {
        await apiClient.from("cms_versions" as any).insert({
          section_key: sectionKey,
          content: (existing as any).content,
          updated_by: userId,
          note: `Auto-saved before update`,
        } as any);
      }

      if ((existing as any)?.id) {
        // Update existing row by ID
        const { error } = await apiClient
          .from("site_content" as any)
          .update({ content, updated_by: userId } as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        // Insert new row
        const { error } = await apiClient
          .from("site_content" as any)
          .insert({ section_key: sectionKey, content, updated_by: userId } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, { sectionKey }) => {
      queryClient.invalidateQueries({ queryKey: ["site_content"] });
      queryClient.invalidateQueries({ queryKey: ["cms_versions"] });
      toast.success(`${sectionKey} কন্টেন্ট আপডেট হয়েছে`);
    },
    onError: (error: any) => {
      toast.error(error.message || "কন্টেন্ট আপডেট করতে ব্যর্থ");
    },
  });
}

export function useCmsVersions(sectionKey?: string) {
  return useQuery({
    queryKey: ["cms_versions", sectionKey],
    queryFn: async () => {
      let query = apiClient.from("cms_versions" as any).select("*").order("created_at", { ascending: false }).limit(50);
      if (sectionKey) {
        query = query.eq("section_key", sectionKey);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) || [];
    },
    staleTime: 1000 * 60 * 2,
  });
}
