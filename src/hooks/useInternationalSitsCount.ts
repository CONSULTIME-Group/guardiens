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
    queryFn: async (): Promise<{ count: number }> => {
      const { count } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .not("country", "is", null)
        .not("country", "in", "(FR,France)");

      return { count: count ?? 0 };
    },
  });

  return {
    count: data?.count ?? 0,
    isLoading,
  };
}
