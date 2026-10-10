/**
 * Compte les annonces publiées à l'étranger (hors France).
 * Cache 10 min via react-query. Ne bloque jamais le rendu.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyOpenSitFilter } from "@/lib/sitSearchRules";

export function useInternationalSitsCount() {
  const { data, isLoading } = useQuery({
    queryKey: ["international-sits-count"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<{ count: number }> => {
      // Lot L1 : annonces ouvertes uniquement, mêmes règles que la recherche.
      const { count } = await applyOpenSitFilter(
        supabase.from("sits").select("id", { count: "exact", head: true }),
      )
        .not("country", "is", null)
        .neq("country", "FR");

      return { count: count ?? 0 };
    },
  });

  return {
    count: data?.count ?? 0,
    isLoading,
  };
}
