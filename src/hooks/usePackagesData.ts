import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export function useActivePackages() {
  return useQuery({
    queryKey: ["active_packages"],
    queryFn: async () => {
      const { data } = await apiClient
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .eq("show_on_website", true)
        .order("price", { ascending: true });
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 15,
  });
}
