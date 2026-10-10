/**
 * Compte les annonces publiées à l'étranger (hors France), pour l'accueil.
 * Cache 10 min via react-query. Ne bloque jamais le rendu.
 *
 * Lot L2 : volontairement une seule lecture sur sits.country (budget de
 * lectures de l'accueil, verrou src/__tests__/p3/). Les pages d'annonces
 * utilisent le moteur complet (src/lib/intlSitSearch.ts, lieu du
 * propriétaire). Écart mesuré au 10/10/2026 : nul.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyOpenSitFilter } from "@/lib/sitSearchRules";

export function useInternationalSitsCount() {
  const { data, isLoading } = useQuery({
    queryKey: ["international-sits-count"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<{ count: number }> => {
      const { count } = await applyOpenSitFilter(
        supabase.from("sits").select("id", { count: "exact", head: true }),
      )
        .not("country", "is", null)
        .neq("country", "FR");
      return { count: count ?? 0 };
    },
  });
  return { count: data?.count ?? 0, isLoading };
}
