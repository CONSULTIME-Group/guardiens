/**
 * Compte les annonces publiées à l'étranger (hors France).
 * Cache 10 min via react-query. Ne bloque jamais le rendu.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInternationalSitsCount() {
  const { data, isLoading } = useQuery({
    queryKey: ["international-sits-count"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<{ count: number; recent: Array<{ id: string; city: string | null; country: string | null; title: string | null }> }> => {
      const { count } = await (supabase as any)
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .not("country", "is", null)
        .not("country", "in", "(FR,France)");

      const { data: recent } = await (supabase as any)
        .from("sits")
        .select("id,title,city,country")
        .eq("status", "published")
        .not("country", "is", null)
        .not("country", "in", "(FR,France)")
        .order("created_at", { ascending: false })
        .limit(3);

      return { count: count ?? 0, recent: recent ?? [] };
    },
  });

  return {
    count: data?.count ?? 0,
    recent: data?.recent ?? [],
    isLoading,
  };
}
