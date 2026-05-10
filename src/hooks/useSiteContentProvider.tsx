import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

interface SiteContentContextType {
  content: Record<string, any>;
  loading: boolean;
}

const SiteContentContext = createContext<SiteContentContextType>({
  content: {},
  loading: true,
});

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["site_content_all"],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from("site_content")
        .select("*")
        .order("section_key");
      if (error) throw error;
      const map: Record<string, any> = {};
      (data as any[])?.forEach((row: any) => {
        map[row.section_key] = row.content;
      });
      return map;
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 15,
  });

  return (
    <SiteContentContext.Provider value={{ content: data || {}, loading: isLoading }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useBulkSiteContent(sectionKey: string) {
  const ctx = useContext(SiteContentContext);
  return { data: ctx.content[sectionKey] || null, isLoading: ctx.loading };
}

export function useSiteContentCtx() {
  return useContext(SiteContentContext);
}
